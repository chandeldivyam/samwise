import { initializeDatabase, getDbManager } from './database';

async function testDatabaseOperations() {
  try {
    // Initialize the database
	await initializeDatabase();
	const dbManager = getDbManager();
    await dbManager.initialize();

    // 1. Create a table
    await dbManager.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        age INTEGER
      )
    `);
    console.log("1. Table 'users' created successfully");

    // 2. Insert rows
    const userId1 = await dbManager.insert('users', {
      name: 'John Doe',
      email: 'john@example.com'
    });
	
    console.log(`2a. Inserted user with ID: ${userId1}`);

    const userId2 = await dbManager.insert('users', {
      name: 'Jane Smith',
      email: 'jane@example.com',
      age: 25
    });
    console.log(`2b. Inserted user with ID: ${userId2}`);

    // 3. Select all rows
    const allUsers = await dbManager.select('SELECT * FROM users');
    console.log("3. All users:", allUsers);

    // 4. Select single row with few columns
    const singleUser = await dbManager.select(
      'SELECT name, email FROM users WHERE id = :id',
      { id: userId1 }
    );
    if (singleUser.length > 0) {
      console.log("4. Single user (name and email):", singleUser[0]);
    } else {
      console.log("4. User not found");
    }

    // 5. Update row
    const updatedRows = await dbManager.update(
      'users',
      { age: 31 },
      'id = :id',
      { id: userId1 }
    );
    console.log(`5. Updated ${updatedRows} row(s)`);

    // Verify the update
    const updatedUser = await dbManager.select(
      'SELECT * FROM users WHERE id = :id',
      { id: userId1 }
    );
    if (updatedUser.length > 0) {
      console.log("Updated user:", updatedUser[0]);
    } else {
      console.log("Updated user not found");
    }

  } catch (error) {
    console.error("An error occurred during database operations:", error);
  }
}

export default testDatabaseOperations;
