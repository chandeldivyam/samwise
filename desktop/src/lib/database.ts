import Database from "@tauri-apps/plugin-sql";
import { databaseName, maxConnections } from "./config";

interface QueryParams {
    [key: string]: any;
}

export class DatabaseManager {
    private static instance: DatabaseManager;
    private connectionPool: Database[] = [];
    private activeConnections = 0;
    private initialized = false;

    private constructor() {}

    static getInstance(): DatabaseManager {
        if (!DatabaseManager.instance) {
            DatabaseManager.instance = new DatabaseManager();
        }
        return DatabaseManager.instance;
    }

    async initialize(
        dbPath: string = databaseName || "sqlite:samwise.db",
    ): Promise<void> {
        if (this.initialized) {
            console.log("Database already initialized");
            return;
        }

        try {
            for (let i = 0; i < maxConnections; i++) {
                const connection = await Database.load(dbPath);
                this.connectionPool.push(connection);
            }
            this.initialized = true;
            console.log("Database initialized successfully");
        } catch (error) {
            console.error("Failed to initialize database pool:", error);
            throw error;
        }
    }

    private async getConnection(): Promise<Database> {
        if (this.activeConnections < this.connectionPool.length) {
            this.activeConnections++;
            return this.connectionPool[this.activeConnections - 1];
        }
        throw new Error("No available connections in the pool");
    }

    private releaseConnection(): void {
        if (this.activeConnections > 0) {
            this.activeConnections--;
        }
    }

    private buildQuery(query: string, params: QueryParams): [string, any[]] {
        const bindings: any[] = [];
        let paramIndex = 1;
        const processedQuery = query.replace(/\:(\w+)/g, (match, key) => {
            if (params.hasOwnProperty(key)) {
                bindings.push(params[key]);
                return `$${paramIndex++}`;
            }
            return match;
        });
        return [processedQuery, bindings];
    }

    async execute(query: string, params: QueryParams = {}): Promise<void> {
        const connection = await this.getConnection();
        try {
            const [processedQuery, bindings] = this.buildQuery(query, params);
            await connection.execute(processedQuery, bindings);
        } catch (error) {
            console.error("Failed to execute query:", error);
            throw error;
        } finally {
            this.releaseConnection();
        }
    }

    async select<T = any>(
        query: string,
        params: QueryParams = {},
    ): Promise<T[]> {
        const connection = await this.getConnection();
        try {
            const [processedQuery, bindings] = this.buildQuery(query, params);
            const result: any = await connection.select<T>(processedQuery, bindings);
            return result;
        } catch (error) {
            console.error("Failed to execute select query:", error);
            throw error;
        } finally {
            this.releaseConnection();
        }
    }

    async insert(table: string, data: QueryParams): Promise<number> {
        const columns = Object.keys(data).map(this.escapeIdentifier).join(", ");
        const placeholders = Object.keys(data)
            .map((key) => `:${key}`)
            .join(", ");
        const query = `INSERT INTO ${this.escapeIdentifier(table)} (${columns}) VALUES (${placeholders}) RETURNING id`;

        try {
            const result = await this.select<{ id: number }>(query, data);
            if (result && result.length > 0) {
                return result[0].id;
            }
            throw new Error("Insert operation did not return an ID");
        } catch (error) {
            console.error("Failed to insert data:", error);
            throw error;
        }
    }

    async update(
        table: string,
        data: QueryParams,
        whereClause: string,
        whereParams: QueryParams = {},
    ): Promise<number> {
        const setClause = Object.keys(data)
            .map((key) => `${this.escapeIdentifier(key)} = :${key}`)
            .join(", ");
        const query = `UPDATE ${this.escapeIdentifier(table)} SET ${setClause} WHERE ${whereClause}`;
        const params = { ...data, ...whereParams };

        try {
            await this.execute(query, params);
            const result = await this.select<{ count: number }>(
                "SELECT changes() as count",
            );
            return result[0]?.count ?? 0;
        } catch (error) {
            console.error("Failed to update data:", error);
            throw error;
        }
    }

    async transaction<T>(
        callback: (db: DatabaseManager) => Promise<T>,
    ): Promise<T> {
        const connection = await this.getConnection();
        try {
            await connection.execute("BEGIN TRANSACTION");
            const result = await callback(this);
            await connection.execute("COMMIT");
            return result;
        } catch (error) {
            await connection.execute("ROLLBACK");
            console.error("Transaction failed:", error);
            throw error;
        } finally {
            this.releaseConnection();
        }
    }

    async createTable(tableName: string, columns: string[]): Promise<void> {
        const columnDefinitions = columns.join(", ");
        const query = `CREATE TABLE IF NOT EXISTS ${this.escapeIdentifier(tableName)} (${columnDefinitions})`;
        await this.execute(query);
    }

    async tableExists(tableName: string): Promise<boolean> {
        const query =
            "SELECT name FROM sqlite_master WHERE type='table' AND name = :tableName";
        const result = await this.select<{ name: string }>(query, {
            tableName,
        });
        return result.length > 0;
    }

    escapeIdentifier(identifier: string): string {
        return `"${identifier.replace(/"/g, '""')}"`;
    }

    escapeLikePattern(pattern: string): string {
        return pattern.replace(/[%_]/g, (char) => `\\${char}`);
    }

	isInitialized(): boolean {
        return this.initialized;
    }
}

// Export a function to get the singleton instance
export function getDbManager(): DatabaseManager {
    return DatabaseManager.getInstance();
}

// Export a function to initialize the database
export async function initializeDatabase(): Promise<void> {
    const dbManager = getDbManager();
    if (!dbManager.isInitialized()) {
        await dbManager.initialize();
    }
}
