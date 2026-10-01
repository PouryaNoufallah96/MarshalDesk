import { ERROR_STATUS } from "@marshaldesk/shared";
import { COMMON_ERROR_STATUS_MAP, OpenAPIGenerator } from "@orpc/openapi";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferenceHandlerPlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { ZodToJsonSchemaConverter } from "@orpc/zod";
import { router } from "@/lib/orpc/router";

// Mounted under /api/v1 so it never shadows Neon Auth's /api/auth proxy.
const prefix = "/api/v1";

const errorStatusMap = { ...COMMON_ERROR_STATUS_MAP, ...ERROR_STATUS };

const generator = new OpenAPIGenerator({
  converters: [new ZodToJsonSchemaConverter()],
});

const handler = new OpenAPIHandler(router, {
  errorStatusMap,
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
  plugins: [
    new OpenAPIReferenceHandlerPlugin({
      specPath: "/spec.json",
      docsPath: "/docs",
      spec: () =>
        generator.generate(router, {
          errorStatusMap,
          base: {
            info: { title: "MarshalDesk API", version: "0.1.0" },
            servers: [{ url: prefix }],
          },
        }),
    }),
  ],
});

async function handleRequest(request: Request) {
  const { matched, response } = await handler.handle(request, {
    prefix,
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
