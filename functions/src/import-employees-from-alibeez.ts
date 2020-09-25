import * as firebase from "firebase-admin";
import fetch from "node-fetch";
import { Config, asNumber } from "./config";

interface AlibeezEmployee {
  username: string;
  firstName: string | null;
  lastName: string | null;
  operationalManager: string | null;
  operationalManagerShortUsername: string | null;
  tags: {
    etablissement: string | null;
    agency: string | null;
  };
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
        .doc(employee.email.toLowerCase()),
      employee
    )
  );
  await batch.commit();
};

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
    throw new Error(
      `Alibeez responded with a '${response.status} ${
        response.statusText
      }' error: ${await response.text()}`
    );
  }
  const employees = (await response.json()) as AlibeezEmployee[];
  const employeesToSave = employees.map(employee => ({
    email: employee.username,
    fullName: `${employee.firstName} ${employee.lastName}`,
    managerEmail: employee.operationalManagerShortUsername
      ? `${employee.operationalManagerShortUsername}@zenika.com`
      : null,
    agency: employee.tags.etablissement
  }));
  const leftToSend = [...employeesToSave];
  while (leftToSend.length > 0) {
    const nextBatch = leftToSend.splice(
      0,
      asNumber(config.features.daily_alibeez_import.batch_size)
    );
    console.info(
      `Trying to import ${nextBatch.length} employees, ${leftToSend.length} left`
    );
    await saveEmployees(nextBatch);
  }
};
