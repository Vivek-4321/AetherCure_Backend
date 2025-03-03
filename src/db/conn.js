import { Client } from "dpg";
import { config } from "dotenv";
config({ path: "../../.env" });
const defineConfig = {
  user:Deno.env.get('DB_USER'),
  password: Deno.env.get('DB_PASSWORD'),
  hostname: Deno.env.get('DB_HOST'), 
  port: Number(Deno.env.get('DB_PORT')),
  database: Deno.env.get('DB_NAME'),
}
 

const client = new Client(defineConfig);
await client.connect();     
export default client;