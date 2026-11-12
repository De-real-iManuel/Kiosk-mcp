import express, { type Express } from "express";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";
import { errorHandler } from "./middlewares/error-handler";

const app: Express = express();

// The API is deployed behind one AWS Application Load Balancer. Keep this in
// sync with the service security group: tasks must not be publicly reachable.
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());
const allowedOrigins = new Set(
  (
    process.env.CORS_ALLOWED_ORIGINS ??
    "http://localhost:3000,https://d127130891zv0m.cloudfront.net"
  )
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);

// Never reflect arbitrary Origin values when credentialed requests are enabled.
app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("CORS: origin not allowed"));
    },
  }),
);
app.use(express.json({ limit: "32kb" }));
app.use(express.urlencoded({ extended: true, limit: "32kb" }));
app.use(
  clerkMiddleware({
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
    secretKey: process.env.CLERK_SECRET_KEY,
  }),
);

app.use("/api", router);

// IMPORTANT: error handler must be registered LAST
app.use(errorHandler);

export default app;
