import request from "./brightspace";
import Route from "./route";

export interface User {
  first_name: string;
  last_name: string;
}

interface WhoAmIResponse {
  Identifier: string;
  FirstName: string;
  LastName: string;
  Pronouns: string;
  UniqueName: string;
  ProfileIdentifier: string;
}

export async function getCurrentUser(): Promise<User> {
  const response: WhoAmIResponse = await request(new Route("GET", "/d2l/api/lp/1.58/users/whoami"));

  if (!response || !response.FirstName || !response.LastName) {
    throw new Error("Invalid response from whoami endpoint");
  }

  return {
    first_name: response.FirstName,
    last_name: response.LastName,
  }
}
