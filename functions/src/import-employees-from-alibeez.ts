import * as firebase from "firebase-admin";
import fetch from "node-fetch";
import { AlibeezConfig } from "./config";
import partition = require("lodash.partition");

interface AlibeezEmployee {
  fullName: string;
  zenikaEmail: string;
  operationalManagerShortUsername: string;
}

const obfuscateKey = key => {
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

export const importEmployeesFromAlibeez = async (config: AlibeezConfig) => {
  const requestRef = await firebase
    .firestore()
    .collection("alibeez-requests")
    .add({
      at: new Date().toISOString(),
      url: config.url,
      key: obfuscateKey(config.key)
    });
  const response = await fetch(config.url, {
    headers: {
      Authorization: config.key
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
    return;
  }
  const employees: AlibeezEmployee[] = await response.json();
  const [employeesWithValidEmail, employeesWithNoValidEmail] = partition(
    employees,
    employee =>
      employee.zenikaEmail && employee.zenikaEmail.endsWith("@zenika.com")
  );
  employeesWithNoValidEmail.forEach(employee => {
    console.info("employee with no valid email: " + employee.fullName);
  });
  const importRef = firebase
    .firestore()
    .collection("employee-imports")
    .doc(requestRef.id);
  const batch = firebase.firestore().batch();
  batch.set(importRef, {
    at: new Date().toISOString(),
    employeeCount: employees.length,
    employeeWithValidEmailCount: employeesWithValidEmail.length
  });
  employeesWithValidEmail
    .map(employee => ({
      fullName: employee.fullName,
      email: employee.zenikaEmail,
      managerEmail: employee.operationalManagerShortUsername
        ? employee.operationalManagerShortUsername + "@zenika.com"
        : null,
      agency: employee.geographicalAgency
    }))
    .forEach(employee =>
      batch.set(importRef.collection("employees").doc(employee.email), employee)
    );
  await batch.commit();
};
