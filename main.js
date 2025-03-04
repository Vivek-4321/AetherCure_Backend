import client from "./src/db/conn.js";
import { Application } from "oak";
import { oakCors } from "oakCors";
import { authRouter } from "./src/main/routes.js";
import { config } from "dotenv";
import { fileRouter } from "./src/main/routes.js";
import { medicalInfoRouter } from "./src/main/routes.js";
config({ path: "./.env" });
const app = new Application();
// Enable CORS for all routes
// Configure CORS with specific options
app.use(
  oakCors({
    origin: (requestOrigin) => {
      const allowedOrigins = [
        "https://aethercure.vercel.app",
        "http://localhost:5173",
      ];
      return allowedOrigins.includes(requestOrigin) ? requestOrigin : false;
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(authRouter.routes());
app.use(authRouter.allowedMethods());

// Mount file routes
app.use(fileRouter.routes());
app.use(fileRouter.allowedMethods());

// Mount medical info routes
app.use(medicalInfoRouter.routes());
app.use(medicalInfoRouter.allowedMethods());

console.log(`Server is running on http://localhost:${Deno.env.get("PORT")}/`);
await app.listen({ port: parseInt(Deno.env.get("PORT")) });
