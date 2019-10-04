import * as firebase from "firebase-admin";
import fetch from "node-fetch";
import { Config, asNumber } from "./config";

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

const obfuscateKey = (key: string) => {
  if (key) {
    if (key.length > 8) {
      return `${key.substr(0, 4)}***`;
    } else {
      return "***";
    }
  } else {
    return null;
  }
};

const saveEmployees = async (employees: Employee[]) => {
  const batch = firebase.firestore().batch();
  employees.forEach(employee =>
    batch.set(
      firebase
        .firestore()
        .collection("employees")
        .doc(employee.email),
      employee
    )
  );
  await batch.commit();
};

const hasValidEmail = (employee: AlibeezEmployee) =>
  employee.email.endsWith("@zenika.com");
const hasNoValidEmail = (employee: AlibeezEmployee) => !hasValidEmail(employee);

export const importEmployeesFromAlibeez = async (config: Config) => {
  const requestRef = await firebase
    .firestore()
    .collection("alibeez-requests")
    .add({
      at: new Date().toISOString(),
      url: config.alibeez.url,
      key: obfuscateKey(config.alibeez.key)
    });
  const response = await fetch(config.alibeez.url, {
    headers: {
      Authorization: config.alibeez.key
    }
  });
  const responseCollection = firebase
    .firestore()
    .collection("alibeez-responses");
  await responseCollection.add({
    request: requestRef,
    at: new Date().toISOString(),
    ok: response.ok,
    status: response.status
  });
  if (!response.ok) {
    const errorPayload =
      response.headers.get("Content-Type") === "application/json"
        ? JSON.stringify(await response.json())
        : await response.text();
    throw new Error(
      `Alibeez responded with a '${response.status} ${
        response.statusText
      }' error: ${errorPayload}`
    );
  }
  const { employees } = (await response.json()) as AlibeezSuccessResponse;
  const employeesWithValidEmail = employees.filter(hasValidEmail);
  const employeesWithNoValidEmail = employees.filter(hasNoValidEmail);
  employeesWithNoValidEmail.forEach(employee => {
    console.info("employee with no valid email: " + employee.fullName);
  });

  const employeesToSave = employeesWithValidEmail.map(employee => ({
    email: employee.email,
    fullName: employee.fullName,
    managerEmail: employee.manager ? employee.manager.email : null,
    agency: employee.location
  }));
  const leftToSend = [...employeesToSave];
  while (leftToSend.length > 0) {
    const nextBatch = leftToSend.splice(
      0,
      asNumber(config.features.daily_alibeez_import.batch_size)
    );
    console.info(
      `Trying to import ${nextBatch.length} employees, ${
        leftToSend.length
      } left`
    );
    await saveEmployees(nextBatch);
  }
};
