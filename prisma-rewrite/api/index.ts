import express from "express";
import { Prisma } from "./prisma-client";

const {
  PROXYBEEZ_URL = "",
  PROXYBEEZ_KEY = "",
  PRISMA_ENDPOINT = "",
  PRISMA_SECRET = ""
} = process.env;
if (!PROXYBEEZ_URL || !PROXYBEEZ_KEY || !PRISMA_ENDPOINT || !PRISMA_SECRET) {
  console.error("missing env var");
  process.exit();
}

interface AlibeezSuccessResponse {
  employees: AlibeezEmployee[];
  size: number;
  errors: { [key: string]: AlibeezError };
}

interface AlibeezError {
  statusCode: number;
  statusText: string;
  errorCode: string;
  errorMessage: string;
}

interface AlibeezEmployee {
  email: string;
  fullName: string | null;
  manager: AlibeezManager | null;
  location: string | null;
  division: string | null;
}

interface AlibeezManager {
  fullName: string;
  email: string;
}

export interface Employee {
  email: string;
  fullName: string | null;
  managerEmail: string | null;
  agency: string | null;
}

const hasValidEmail = (employee: AlibeezEmployee) =>
  employee.email.endsWith("@zenika.com");
const hasNoValidEmail = (employee: AlibeezEmployee) => !hasValidEmail(employee);

const prisma = new Prisma({
  endpoint: PRISMA_ENDPOINT,
  secret: PRISMA_SECRET
});

const syncEmployees = async () => {
  const proxybeezResponse = await fetch(PROXYBEEZ_URL, {
    headers: {
      Authorization: PROXYBEEZ_KEY
    }
  });
  const {
    employees
  } = (await proxybeezResponse.json()) as AlibeezSuccessResponse;
  const employeesWithValidEmail = employees.filter(hasValidEmail);
  const employeesWithNoValidEmail = employees.filter(hasNoValidEmail);
  employeesWithNoValidEmail.forEach(employee => {
    console.info("employee with no valid email: " + employee.fullName);
  });
  for (const employee of employeesWithValidEmail) {
    if (employee.location) {
      await prisma.upsertAgency({
        where: { name: employee.location },
        create: { name: employee.location },
        update: {}
      });
    }
    if (employee.manager) {
      await prisma.upsertEmployee({
        where: { email: employee.manager.email },
        create: { email: employee.manager.email },
        update: {}
      });
    }
    await prisma.upsertEmployee({
      where: { email: employee.email },
      create: {
        email: employee.email,
        fullName: employee.fullName || undefined,
        ...(employee.location && {
          agency: { connect: { name: employee.location } }
        }),
        ...(employee.manager && {
          manager: { connect: { email: employee.manager.email } }
        })
      },
      update: {
        fullName: employee.fullName || undefined,
        ...(employee.location && {
          agency: { connect: { name: employee.location } }
        }),
        ...(employee.manager && {
          manager: { connect: { email: employee.manager.email } }
        })
      }
    });
  }
};

const app = express();

app.post("/sync-employees", async (req, res, next) => {
  try {
    await syncEmployees();
  } catch (err) {
    next(err);
  }
  res.sendStatus(200);
});

app.listen(4005);
