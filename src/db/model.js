import { UserTable, FileTable, SymptomTable } from './schema.js';
import client from "./conn.js";

//create user 
export async function createUser(user) { 
   const query = ` INSERT INTO users (email, userName, password) VALUES ($1, $2, $3) RETURNING *; `; 
   const values = [user.email, user.userName, user.password]; 
   try {
     const res = await client.queryObject({text:query,args:values});
      return res.rows[0]; 
    } catch (error) {
       throw new Error(error); 
      } }

//get all users 
export async function getAllUsers() {
  const query = `
    SELECT * FROM users;
  `;

  try {
    const res = await client.queryObject({text:query});
    return res.rows;
  } catch (error) {
    throw new Error("DatabaseConnectionError");
  }
}

//check username exists 
export async function checkUserName( userName ) {
  try{
  if (!userName || userName.length <= 1) {
     throw new Error("ValidationError: userName must be more than one character");
  }
  const query = ` SELECT 1 FROM users WHERE userName = $1;`;
  const values = [userName];
  console.log(values);
  
    const res = await client.queryObject({text:query,args:values});
    const rowCount = res.rows.length;
    return rowCount > 0;
  } catch (error) {
    const err =  new Error("DatabaseConnectionError"+error);
    err.status = 500;
    throw err;
  }
}


//get user by user id 
export async function getUserById(userId ) {
  const query = `
    SELECT * FROM users
    WHERE userId = $1;
  `;
  const values = [userId];

  try {
    const res = await client.queryObject({text:query,args:values});
    return res.rows[0];
  } catch (error) {
    throw new Error("DatabaseConnectionError");
  }
}

export async function updateUser(userId, updates) {
  try {
  if (!userId) {
    throw new Error("InvalidUserId");
  }

  // Get current user data first
  const getCurrentUser = `SELECT * FROM users WHERE userId = $1;`;
  const value = [userId];
  //update user 
 
    const currentUser = await client.queryObject({
      text: getCurrentUser,
      args: value
    });

    if (!currentUser.rows[0]) {
      throw new Error("UserNotFound");
    }
    // Merge current data with updates
    const current = currentUser.rows[0];
    const updatedData = {
      email: updates.email ?? current.email,
      userName: updates.userName ?? current.username,
      password: updates.password ?? current.password,
      googleId: updates.googleId ?? current.googleId,
      userIdOnBlockchain: updates.userIdOnBlockchain ?? current.userIdOnBlockchain,
      referenceLocation: updates.referenceLocation ?? current.referenceLocation,
      dataSharable: updates.dataSharable ?? current.dataSharable
    };
    const query = `
      UPDATE users
      SET email = $1, 
          userName = $2, 
          password = $3, 
          googleId = $4, 
          userIdOnBlockchain = $5, 
          referenceLocation = $6, 
          dataSharable = $7,
          updatedAt = CURRENT_TIMESTAMP
      WHERE userId = $8
      RETURNING *;
    `;

    const values = [
      updatedData.email,
      updatedData.userName,
      updatedData.password,
      updatedData.googleId,
      updatedData.userIdOnBlockchain,
      updatedData.referenceLocation,
      updatedData.dataSharable,
      userId
    ];

    const res = await client.queryObject({
      text: query,
      args: values
    });
    
    return res.rows[0];
  }catch (error) {
    console.error('Database error:', error);
    throw new Error(error.message || "DatabaseConnectionError");
  }
}


//delete user 
export async function deleteUser( userId ) {
  const query = `
    DELETE FROM users
    WHERE userId = $1
    RETURNING *;
  `;
  const values = [userId];

  try {
    const res = await client.queryObject({text:query,args:values});
    return res.rows[0];
  } catch (error) {
    throw new Error("DatabaseConnectionError");
  }
}

//get user by email
export async function getUserByEmail( email ) {
  const query = `
    SELECT * FROM users
    WHERE email = $1;
  `;
  const values = [email];

  try {
    const res = await client.queryObject({text:query,args:values});
    return res.rows[0];
  } catch (error) {
    throw new Error("DatabaseConnectionError");
  }
}

// File Table CRUD Operations

// Create a new file record
// Enhanced createFile to ensure consistent casing in the response
export async function createFile(fileData) {
  const query = `
    INSERT INTO files (
      userId, 
      url, 
      fileuuid, 
      expirationTime, 
      fileName, 
      fileType, 
      fileSize, 
      ipfsHash,
      createdAt,
      updatedAt
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING *;
  `;
  
  const values = [
    fileData.userId,
    fileData.url,
    fileData.fileuuid,
    fileData.expirationTime || 0,
    fileData.fileName || 'Unnamed File',
    fileData.fileType || 'application/octet-stream',
    fileData.fileSize || 0,
    fileData.ipfsHash || ''
  ];

  try {
    const res = await client.queryObject({text: query, args: values});
    const fileRecord = res.rows[0];
    
    console.log("File record created:", fileRecord);
    
    // Return with consistent property casing
    return {
      ...fileRecord,
      // Ensure camelCase property names
      fileId: fileRecord.fileid || fileRecord.fileId,
      userId: fileRecord.userid || fileRecord.userId,
      fileName: fileRecord.filename || fileRecord.fileName,
      fileType: fileRecord.filetype || fileRecord.fileType,
      ipfsHash: fileRecord.ipfshash || fileRecord.ipfsHash,
      fileSize: fileRecord.filesize || fileRecord.fileSize,
      expirationTime: fileRecord.expirationtime || fileRecord.expirationTime,
    };
  } catch (error) {
    console.error('Error creating file:', error);
    throw new Error('DatabaseConnectionError');
  }
}

// Get all file records
export async function getFiles() {
  try {
    const query = `SELECT * FROM files ORDER BY createdAt DESC;`;
    const res = await client.queryObject({text: query});
    return res.rows;
  } catch (error) {
    throw new Error('DatabaseConnectionError');
  }
}

// Get files by user ID
// Enhanced getFilesByUserId to explicitly format dates
export async function getFilesByUserId(userId) {
  const query = `
    SELECT * FROM files
    WHERE userId = $1
    ORDER BY createdAt DESC;
  `;
  const values = [userId];

  try {
    const res = await client.queryObject({text:query, args:values});
    
    // Log a sample file if available for debugging
    if (res.rows.length > 0) {
      console.log("Sample file from DB:", res.rows[0]);
      console.log("Sample file date types - createdAt:", typeof res.rows[0].createdat);
    } else {
      console.log("No files found for user ID:", userId);
    }
    
    // Format dates properly for all files
    const files = res.rows.map(file => {
      let createdAt = null;
      let updatedAt = null;
      
      // Handle different property name casings (PostgreSQL may return lowercase)
      const createdAtValue = file.createdat || file.createdAt;
      const updatedAtValue = file.updatedat || file.updatedAt;
      
      try {
        if (createdAtValue) {
          const date = new Date(createdAtValue);
          if (!isNaN(date.getTime())) {
            createdAt = date.toISOString();
          }
        }
      } catch (e) {
        console.error("Error formatting createdAt:", e);
      }
      
      try {
        if (updatedAtValue) {
          const date = new Date(updatedAtValue);
          if (!isNaN(date.getTime())) {
            updatedAt = date.toISOString();
          }
        }
      } catch (e) {
        console.error("Error formatting updatedAt:", e);
      }
      
      return {
        ...file,
        // Ensure casing is consistent (camelCase)
        fileId: file.fileid || file.fileId,
        userId: file.userid || file.userId,
        createdAt,
        updatedAt
      };
    });
    
    return files;
  } catch (error) {
    console.error("Error fetching files:", error);
    throw new Error("DatabaseConnectionError");
  }
}

// Get a file record by its ID
export async function getFileById(fileId) {
  try {
    const query = `SELECT * FROM files WHERE fileId = $1;`;
    const values = [fileId];
    const res = await client.queryObject({text: query, args: values});
    return res.rows[0];
  } catch (error) {
    throw new Error('DatabaseConnectionError');
  }
}

// Update a file record by its ID
export async function updateFile(fileId, updateData, userId) {
  // First verify file ownership
  const checkQuery = `
    SELECT * FROM files
    WHERE fileId = $1 AND userId = $2;
  `;
  const checkValues = [fileId, userId];
  
  try {
    const checkRes = await client.queryObject({text: checkQuery, args: checkValues});
    if (checkRes.rows.length === 0) {
      throw new Error('FileNotFoundOrNotOwned');
    }
    
    // Build the update query dynamically based on provided fields
    let setClause = [];
    let queryValues = [];
    let valueIndex = 1;
    
    if (updateData.expirationTime !== undefined) {
      setClause.push(`expirationTime = $${valueIndex}`);
      queryValues.push(updateData.expirationTime);
      valueIndex++;
    }
    
    if (updateData.fileName !== undefined) {
      setClause.push(`fileName = $${valueIndex}`);
      queryValues.push(updateData.fileName);
      valueIndex++;
    }
    
    if (updateData.fileType !== undefined) {
      setClause.push(`fileType = $${valueIndex}`);
      queryValues.push(updateData.fileType);
      valueIndex++;
    }
    
    // Always update the updatedAt timestamp
    setClause.push(`updatedAt = CURRENT_TIMESTAMP`);
    
    // Add the fileId and userId as the last parameters
    queryValues.push(fileId);
    queryValues.push(userId);
    
    const query = `
      UPDATE files
      SET ${setClause.join(', ')}
      WHERE fileId = $${valueIndex} AND userId = $${valueIndex + 1}
      RETURNING *;
    `;
    
    const res = await client.queryObject({text: query, args: queryValues});
    return res.rows[0];
  } catch (error) {
    console.error('Error updating file:', error);
    throw new Error(error.message || 'DatabaseConnectionError');
  }
}

// Delete a file record by its ID with owner verification
export async function deleteFile(fileId, userId) {
  // First verify file ownership
  const checkQuery = `
    SELECT * FROM files
    WHERE fileId = $1 AND userId = $2;
  `;
  const checkValues = [fileId, userId];
  
  try {
    const checkRes = await client.queryObject({text: checkQuery, args: checkValues});
    if (checkRes.rows.length === 0) {
      throw new Error('FileNotFoundOrNotOwned');
    }
    
    // Delete the file once ownership is verified
    const query = `
      DELETE FROM files
      WHERE fileId = $1
      RETURNING *;
    `;
    const values = [fileId];
    
    const res = await client.queryObject({text: query, args: values});
    return res.rows[0];
  } catch (error) {
    console.error('Error deleting file:', error);
    throw new Error(error.message || 'DatabaseConnectionError');
  }
}

// Create a shared file link with expiration
export async function createSharedFileLink(fileId, userId, expirationHours) {
  // First verify the file belongs to the user
  const fileQuery = `
    SELECT * FROM files
    WHERE fileId = $1 AND userId = $2;
  `;
  const fileValues = [fileId, userId];
  
  try {
    const fileRes = await client.queryObject({text: fileQuery, args: fileValues});
    if (fileRes.rows.length === 0) {
      throw new Error("FileNotFoundOrNotOwned");
    }
    
    const file = fileRes.rows[0];
    
    // Calculate expiration time in seconds since epoch
    const now = Math.floor(Date.now() / 1000);
    const expirationTime = now + (expirationHours * 60 * 60);
    
    // Generate a share ID
    const shareId = crypto.randomUUID();
    
    // Create shared link record
    const query = `
      INSERT INTO file_shares (
        shareId, 
        fileId, 
        userId, 
        expirationTime,
        createdAt
      ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) RETURNING *;
    `;
    
    const values = [
      shareId,
      fileId,
      userId,
      expirationTime
    ];
    
    const res = await client.queryObject({text: query, args: values});
    
    // Explicitly include the shareId in the response
    return {
      ...res.rows[0],
      shareId: shareId, // Ensure shareId is explicitly included
      fileName: file.fileName,
      url: file.url,
      fileType: file.fileType,
      ipfsHash: file.ipfsHash
    };
  } catch (error) {
    console.error("Error creating shared link:", error);
    throw new Error(error.message || "DatabaseConnectionError");
  }
}

// Create or update medical info for a user
export async function createOrUpdateMedicalInfo(userId, medicalData) {
  try {
    // First, check if a record already exists for this user
    const checkQuery = `
      SELECT id FROM medical_info WHERE userId = $1;
    `;
    const checkValues = [userId];
    
    const checkResult = await client.queryObject({text: checkQuery, args: checkValues});
    
    let query;
    let values;
    
    if (checkResult.rows.length > 0) {
      // Update existing record
      query = `
        UPDATE medical_info
        SET 
          medical_condition = $1,
          medical_background = $2,
          share_data = $3,
          updatedAt = CURRENT_TIMESTAMP
        WHERE userId = $4
        RETURNING *;
      `;
      values = [
        medicalData.medical_condition || null,
        medicalData.medical_background || null,
        medicalData.share_data || false,
        userId
      ];
    } else {
      // Create new record
      query = `
        INSERT INTO medical_info (
          userId,
          medical_condition,
          medical_background,
          share_data,
          createdAt,
          updatedAt
        ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *;
      `;
      values = [
        userId,
        medicalData.medical_condition || null,
        medicalData.medical_background || null,
        medicalData.share_data || false
      ];
    }
    
    const result = await client.queryObject({text: query, args: values});
    
    // Process BigInt values and handle casing consistency
    const processedResult = {
      id: result.rows[0].id,
      userId: result.rows[0].userid || result.rows[0].userId,
      medicalCondition: result.rows[0].medical_condition,
      medicalBackground: result.rows[0].medical_background,
      shareData: result.rows[0].share_data,
      createdAt: result.rows[0].createdat || result.rows[0].createdAt,
      updatedAt: result.rows[0].updatedat || result.rows[0].updatedAt
    };
    
    return processedResult;
  } catch (error) {
    console.error('Error creating/updating medical info:', error);
    throw new Error('DatabaseConnectionError');
  }
}

export async function getMedicalInfoByUserId(userId) {
  try {
    const query = `
      SELECT * FROM medical_info
      WHERE userId = $1;
    `;
    const values = [userId];
    
    const result = await client.queryObject({text: query, args: values});
    
    if (result.rows.length === 0) {
      return null;
    }
    
    // Process result for consistent property casing
    const processedResult = {
      id: result.rows[0].id,
      userId: result.rows[0].userid || result.rows[0].userId,
      medicalCondition: result.rows[0].medical_condition,
      medicalBackground: result.rows[0].medical_background,
      shareData: result.rows[0].share_data,
      createdAt: result.rows[0].createdat || result.rows[0].createdAt,
      updatedAt: result.rows[0].updatedat || result.rows[0].updatedAt
    };
    
    return processedResult;
  } catch (error) {
    console.error('Error getting medical info:', error);
    throw new Error('DatabaseConnectionError');
  }
}

export async function deleteMedicalInfoByUserId(userId) {
  try {
    const query = `
      DELETE FROM medical_info
      WHERE userId = $1
      RETURNING *;
    `;
    const values = [userId];
    
    const result = await client.queryObject({text: query, args: values});
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0];
  } catch (error) {
    console.error('Error deleting medical info:', error);
    throw new Error('DatabaseConnectionError');
  }
}

// Get a shared file by share ID (for public access)
// Enhanced getSharedFileByShareId to ensure the IPFS hash is included
export async function getSharedFileByShareId(shareId) {
  const now = Math.floor(Date.now() / 1000);
  
  const query = `
    SELECT fs.*, f.url, f.fileType, f.fileName, f.ipfsHash, f.fileuuid
    FROM file_shares fs
    JOIN files f ON fs.fileId = f.fileId
    WHERE fs.shareId = $1 AND fs.expirationTime > $2;
  `;
  
  const values = [shareId, now];
  
  try {
    const res = await client.queryObject({text: query, args: values});
    if (res.rows.length === 0) {
      console.log("No shared file found for shareId:", shareId);
      throw new Error("SharedFileExpiredOrNotFound");
    }
    
    const sharedFile = res.rows[0];
    console.log("Raw shared file data from database:", sharedFile);
    
    // Ensure the ipfsHash is properly included with consistent casing
    const result = {
      ...sharedFile,
      // Normalize the case of property names for consistency
      fileId: sharedFile.fileid || sharedFile.fileId,
      fileName: sharedFile.filename || sharedFile.fileName,
      fileType: sharedFile.filetype || sharedFile.fileType,
      ipfsHash: sharedFile.ipfshash || sharedFile.ipfsHash,
      shareId: sharedFile.shareid || sharedFile.shareId,
      expirationTime: sharedFile.expirationtime || sharedFile.expirationTime,
    };
    
    console.log("Normalized shared file data:", result);
    return result;
  } catch (error) {
    console.error("Error getting shared file:", error);
    throw new Error(error.message || "DatabaseConnectionError");
  }
}

// Get all shared links for a user
export async function getSharedLinksByUserId(userId) {
  const query = `
    SELECT fs.*, f.fileName, f.ipfsHash, f.fileuuid, f.fileType
    FROM file_shares fs
    JOIN files f ON fs.fileId = f.fileId
    WHERE fs.userId = $1
    ORDER BY fs.createdAt DESC;
  `;
  
  const values = [userId];
  
  try {
    const res = await client.queryObject({text: query, args: values});
    
    // Ensure we normalize property names to camelCase
    const normalizedLinks = res.rows.map(link => {
      return {
        shareId: link.shareid || link.shareId,
        fileId: link.fileid || link.fileId,
        userId: link.userid || link.userId,
        fileName: link.filename || link.fileName,
        fileType: link.filetype || link.fileType,
        ipfsHash: link.ipfshash || link.ipfsHash,
        expirationTime: link.expirationtime || link.expirationTime,
        createdAt: link.createdat ? new Date(link.createdat).toISOString() : link.createdAt
      };
    });
    
    return normalizedLinks;
  } catch (error) {
    console.error("Error getting shared links:", error);
    throw new Error("DatabaseConnectionError");
  }
}

// Delete a shared link
export async function deleteSharedLink(shareId, userId) {
  // First verify share ownership
  const checkQuery = `
    SELECT * FROM file_shares
    WHERE shareId = $1 AND userId = $2;
  `;
  const checkValues = [shareId, userId];
  
  try {
    const checkRes = await client.queryObject({text: checkQuery, args: checkValues});
    if (checkRes.rows.length === 0) {
      throw new Error('ShareNotFoundOrNotOwned');
    }
    
    // Delete the shared link once ownership is verified
    const query = `
      DELETE FROM file_shares
      WHERE shareId = $1
      RETURNING *;
    `;
    const values = [shareId];
    
    const res = await client.queryObject({text: query, args: values});
    return res.rows[0];
  } catch (error) {
    console.error('Error deleting shared link:', error);
    throw new Error(error.message || 'DatabaseConnectionError');
  }
}

// Symptom Table CRUD Operations

export async function createSymptom(symptomData) {
  const query = `
    INSERT INTO symptoms (
      userId, 
      description, 
      result, 
      confidenceRateOfResult, 
      createdAt
    ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) RETURNING *;
  `;
  
  const values = [
    symptomData.userId,
    symptomData.description,
    symptomData.result,
    symptomData.confidenceRateOfResult
  ];
  
  try {
    const res = await client.queryObject({text: query, args: values});
    return res.rows[0];
  } catch (error) {
    console.error('Error creating symptom:', error);
    throw new Error('DatabaseConnectionError');
  }
}

export async function getSymptoms() {
  try {
    const query = `SELECT * FROM symptoms ORDER BY createdAt DESC;`;
    const res = await client.queryObject({text: query});
    return res.rows;
  } catch (error) {
    throw new Error('DatabaseConnectionError');
  }
}

export async function getSymptomsByUserId(userId) {
  const query = `
    SELECT * FROM symptoms
    WHERE userId = $1
    ORDER BY createdAt DESC;
  `;
  const values = [userId];

  try {
    const res = await client.queryObject({text: query, args: values});
    return res.rows;
  } catch (error) {
    throw new Error("DatabaseConnectionError");
  }
}

export async function getSymptomById(symptomId) {
  try {
    const query = `SELECT * FROM symptoms WHERE symptomId = $1;`;
    const values = [symptomId];
    const res = await client.queryObject({text: query, args: values});
    return res.rows[0];
  } catch (error) {
    throw new Error('DatabaseConnectionError');
  }
}

export async function updateSymptom(symptomId, updateData, userId) {
  // First verify symptom ownership
  const checkQuery = `
    SELECT * FROM symptoms
    WHERE symptomId = $1 AND userId = $2;
  `;
  const checkValues = [symptomId, userId];
  
  try {
    const checkRes = await client.queryObject({text: checkQuery, args: checkValues});
    if (checkRes.rows.length === 0) {
      throw new Error('SymptomNotFoundOrNotOwned');
    }
    
    // Build the update query dynamically based on provided fields
    let setClause = [];
    let queryValues = [];
    let valueIndex = 1;
    
    if (updateData.description !== undefined) {
      setClause.push(`description = $${valueIndex}`);
      queryValues.push(updateData.description);
      valueIndex++;
    }
    
    if (updateData.result !== undefined) {
      setClause.push(`result = $${valueIndex}`);
      queryValues.push(updateData.result);
      valueIndex++;
    }
    
    if (updateData.confidenceRateOfResult !== undefined) {
      setClause.push(`confidenceRateOfResult = $${valueIndex}`);
      queryValues.push(updateData.confidenceRateOfResult);
      valueIndex++;
    }
    
    // Add the symptomId and userId as the last parameters
    queryValues.push(symptomId);
    queryValues.push(userId);
    
    const query = `
      UPDATE symptoms
      SET ${setClause.join(', ')}
      WHERE symptomId = $${valueIndex} AND userId = $${valueIndex + 1}
      RETURNING *;
    `;
    
    const res = await client.queryObject({text: query, args: queryValues});
    return res.rows[0];
  } catch (error) {
    console.error('Error updating symptom:', error);
    throw new Error(error.message || 'DatabaseConnectionError');
  }
}

export async function deleteSymptom(symptomId, userId) {
  // First verify symptom ownership
  const checkQuery = `
    SELECT * FROM symptoms
    WHERE symptomId = $1 AND userId = $2;
  `;
  const checkValues = [symptomId, userId];
  
  try {
    const checkRes = await client.queryObject({text: checkQuery, args: checkValues});
    if (checkRes.rows.length === 0) {
      throw new Error('SymptomNotFoundOrNotOwned');
    }
    
    // Delete the symptom once ownership is verified
    const query = `
      DELETE FROM symptoms
      WHERE symptomId = $1
      RETURNING *;
    `;
    const values = [symptomId];
    
    const res = await client.queryObject({text: query, args: values});
    return res.rows[0];
  } catch (error) {
    console.error('Error deleting symptom:', error);
    throw new Error(error.message || 'DatabaseConnectionError');
  }
}