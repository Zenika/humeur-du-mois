import * as firebase from "firebase-admin";
import fetch from "node-fetch";

interface AlibeezEmployee {
  zenikaEmail: string;
  fullName: string | null;
  operationalManagerShortUsername: string | null;
  geographicalAgency: string | null;
}

interface AlibeezImportConfig {
  url: string;
  key: string;
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
  employee.zenikaEmail && employee.zenikaEmail.endsWith("@zenika.com");
const hasNoValidEmail = (employee: AlibeezEmployee) => !hasValidEmail(employee);

export const importEmployeesFromAlibeez = async (config: AlibeezImportConfig) => {
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
  const employeesWithValidEmail = employees.filter(hasValidEmail);
  const employeesWithNoValidEmail = employees.filter(hasNoValidEmail);
  employeesWithNoValidEmail.forEach(employee => {
    console.info("employee with no valid email: " + employee.fullName);
  });

  const employeesToSave = employeesWithValidEmail.map(employee => ({
    email: employee.zenikaEmail,
    fullName: employee.fullName,
    managerEmail: employee.operationalManagerShortUsername
      ? employee.operationalManagerShortUsername + "@zenika.com"
      : null,
    agency: employee.geographicalAgency
  }));
  await saveEmployees(employeesToSave);
};
