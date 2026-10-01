import { ERROR_STATUS } from "@marshaldesk/shared";
import { COMMON_ERROR_STATUS_MAP, onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { router } from "@/lib/orpc/router";

// The agent's pipeline runs in after() and shares this limit.
export const maxDuration = 300;

const handler = new RPCHandler(router, {
  errorStatusMap: { ...COMMON_ERROR_STATUS_MAP, ...ERROR_STATUS },
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
});

async function handleRequest(request: Request) {
  const { matched, response } = await handler.handle(request, {
    prefix: "/rpc",
    context: { headers: request.headers },
  });
  return matched ? response : new Response("Not found", { status: 404 });
}

export const HEAD = handleRequest;
export const GET = handleRequest;
export const POST = handleRequest;
export const PUT = handleRequest;
export const PATCH = handleRequest;
export const DELETE = handleRequest;
