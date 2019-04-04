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
  /**
   * FIXME: transactional insertion of all employees possible by adding
   * a Company entity that has many agencies and many employees and then
   * upserting this company. This is only possible though if prisma
   * supports createOrConnect in nested create.
   * See https://github.com/prisma/prisma/issues/2194
   */
  for (const employee of employeesWithValidEmail) {
    /**
     * FIXME: pre-emptive upset of agency not needed anymore once prisma
     * implements createOrConnect in nested create
     * See https://github.com/prisma/prisma/issues/2194
     */
    if (employee.location) {
      await prisma.upsertAgency({
        where: { name: employee.location },
        create: { name: employee.location },
        update: {}
      });
    }
    /**
     * FIXME: pre-emptive upset of manager not needed anymore once prisma
     * implements createOrConnect in nested create
     * See https://github.com/prisma/prisma/issues/2194
     */
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
          // would need createOrConnect here
          agency: { connect: { name: employee.location } }
        }),
        ...(employee.manager && {
          // would need createOrConnect here
          manager: { connect: { email: employee.manager.email } }
        })
      },
      update: {
        fullName: employee.fullName || undefined,
        ...(employee.location && {
          // would need createOrConnect here
          agency: { connect: { name: employee.location } }
        }),
        ...(employee.manager && {
          // would need createOrConnect here
          manager: { connect: { email: employee.manager.email } }
        })
      }
    });
  }
};

const subscribe = async () => {
  const employeeSyncJobsIterator = await prisma.$subscribe
    .employeeSyncJob({ mutation_in: ["CREATED"] })
    .node();
  const employeeSyncJobs = {
    [Symbol.asyncIterator]() {
      return employeeSyncJobsIterator;
    }
  };
  for await (const employeeSyncJob of employeeSyncJobs) {
    console.log(
      "sync'ing employees",
      employeeSyncJob.id,
      employeeSyncJob.createdAt
    );
    await prisma.updateEmployeeSyncJob({
      where: { id: employeeSyncJob.id },
      data: { startedAt: new Date() }
    });
    try {
      await syncEmployees();
    } catch (err) {
      await prisma.updateEmployeeSyncJob({
        where: { id: employeeSyncJob.id },
        data: { failedAt: new Date() }
      });
    }
    await prisma.updateEmployeeSyncJob({
      where: { id: employeeSyncJob.id },
      data: { completedAt: new Date() }
    });
    console.log(
      "sync'ed employees",
      employeeSyncJob.id,
      employeeSyncJob.createdAt
    );
  }
};

subscribe().catch(console.error);

const app = express();

app.post("/sync-employees", async (req, res, next) => {
  try {
    const employeeSyncRequest = await prisma.createEmployeeSyncJob({
      host: req.hostname
    });
    console.log(
      "saved sync request",
      employeeSyncRequest.id,
      employeeSyncRequest.createdAt
    );
  } catch (err) {
    next(err);
  }
  res.sendStatus(200);
});

app.listen(4005, () => console.log("ready"));
