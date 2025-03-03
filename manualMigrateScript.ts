// improved-manualMigrateScript.ts
import { Client } from "dpg";
import { walk } from "fs";
import { config } from "dotenv";
config({ path: "./.env" });

const defineConfig = {
  user: Deno.env.get('DB_USER'),
  password: Deno.env.get('DB_PASSWORD'),
  hostname: Deno.env.get('DB_HOST'),
  port: Number(Deno.env.get('DB_PORT')),
  database: Deno.env.get('DB_NAME'),
};

const client = new Client(defineConfig);
await client.connect();
console.log('Database connected successfully');

// First, create the migrations table if it doesn't exist
const initSql = `
CREATE TABLE IF NOT EXISTS migrations (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) NOT NULL UNIQUE,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
`;

try {
  await client.queryArray(initSql);
} catch (error) {
  console.error('Error initializing migrations table:', error);
  await client.end();
  Deno.exit(1);
}

// Get list of migrations that have already been applied
const appliedMigrations = new Set();
try {
  const result = await client.queryArray(`SELECT migration_name FROM migrations;`);
  for (const row of result.rows) {
    appliedMigrations.add(row[0]);
  }
  console.log(`Found ${appliedMigrations.size} previously applied migrations`);
} catch (error) {
  console.error('Error fetching applied migrations:', error);
}

// Sort migration files by name for consistent ordering
const migrationEntries = [];
for await (const entry of walk("./src/db/manualMigrations/", { exts: [".sql"], includeDirs: false })) {
  migrationEntries.push(entry);
}

// Sort migrations by filename
migrationEntries.sort((a, b) => a.name.localeCompare(b.name));

// Function to split SQL smartly (handles dollar-quoted strings and function definitions)
function splitSqlStatements(sql) {
  const statements = [];
  let currentStatement = '';
  let inString = false;
  let inComment = false;
  let inDollarQuote = false;
  let dollarTag = '';
  
  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    const nextChar = sql[i + 1] || '';
    
    // Handle comments
    if (!inString && !inDollarQuote && char === '-' && nextChar === '-') {
      inComment = true;
    }
    
    if (inComment && char === '\n') {
      inComment = false;
    }
    
    // Handle string literals
    if (!inComment && !inDollarQuote && char === "'" && (i === 0 || sql[i - 1] !== '\\')) {
      inString = !inString;
    }
    
    // Handle dollar-quoted strings
    if (!inComment && !inString && char === '$' && nextChar === '$') {
      if (!inDollarQuote) {
        inDollarQuote = true;
        dollarTag = '$$';
      } else if (dollarTag === '$$') {
        inDollarQuote = false;
        dollarTag = '';
      }
    }
    
    // Only split on semicolons that are not in strings, comments, or dollar quotes
    if (char === ';' && !inString && !inComment && !inDollarQuote) {
      statements.push(currentStatement + ';');
      currentStatement = '';
    } else {
      currentStatement += char;
    }
  }
  
  // Add the last statement if it doesn't end with a semicolon
  if (currentStatement.trim()) {
    statements.push(currentStatement);
  }
  
  return statements.filter(s => s.trim());
}

// Apply migrations in order
for (const entry of migrationEntries) {
  // Skip if migration has already been applied
  if (appliedMigrations.has(entry.name)) {
    console.log(`Skipping already applied migration: ${entry.name}`);
    continue;
  }

  console.log(`Applying migration: ${entry.name}`);
  try {
    const sql = await Deno.readTextFile(entry.path);
    
    // Split migration into separate statements
    const statements = splitSqlStatements(sql);
    
    // Execute each statement separately
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      try {
        console.log(`Executing statement ${i+1}/${statements.length}: ${statement.trim().substring(0, 100)}...`);
        await client.queryArray(statement);
      } catch (stmtError) {
        console.error(`Error executing statement ${i+1} in migration ${entry.name}:`, stmtError);
        throw stmtError;
      }
    }
    
    // Record the migration
    await client.queryArray(`
      INSERT INTO migrations (migration_name) 
      VALUES ($1);
    `, [entry.name]);
    
    console.log(`Successfully applied migration: ${entry.name}`);
  } catch (error) {
    console.error(`Error applying migration ${entry.name}:`, error);
    await client.end();
    Deno.exit(1);
  }
}

await client.end();
console.log("All migrations applied successfully");