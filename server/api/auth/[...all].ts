import { toWebRequest } from "h3";
import { getAuth } from "~~/server/utils/auth";

export default defineEventHandler(async (event) => {
  const auth = getAuth(event);
  return auth.handler(toWebRequest(event));
});
