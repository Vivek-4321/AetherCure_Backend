import {
  getUserByEmail,
  createUser,
  checkUserName,
  getUserById,
  updateUser,
  deleteUser,
  getAllUsers,
} from "../db/model.js";
import {
  createFile,
  getFilesByUserId,
  deleteFile,
  createSharedFileLink,
  getSharedFileByShareId,
  getSharedLinksByUserId,
  deleteSharedLink,
  deleteMedicalInfoByUserId,
  getMedicalInfoByUserId,
  createOrUpdateMedicalInfo

} from "../db/model.js";
import * as middleWares from "./middleWare.js";
import { config } from "dotenv";
config({ path: "../../.env" });
const tempStore = new Map(); // In-memory store for temporary data

// Helper function to handle BigInt serialization and properly format dates
const processBigIntValues = (obj) => {
  if (!obj) return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => processBigIntValues(item));
  }
  
  if (typeof obj === 'object' && obj !== null) {
    const newObj = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'bigint') {
        newObj[key] = value.toString();
      } else if (value instanceof Date) {
        // Properly format the date as ISO string
        newObj[key] = value.toISOString();
      } else if (
        // Check if the key is a date field and the value is a valid string or number
        (key === 'createdAt' || key === 'updatedAt' || key.toLowerCase().includes('date') || key.toLowerCase().includes('time')) &&
        (typeof value === 'string' || typeof value === 'number')
      ) {
        try {
          // Try to convert to ISO string if it's a valid date
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            newObj[key] = date.toISOString();
          } else {
            newObj[key] = value;
          }
        } catch (e) {
          newObj[key] = value;
        }
      } else if (typeof value === 'object' && value !== null) {
        newObj[key] = processBigIntValues(value);
      } else {
        newObj[key] = value;
      }
    }
    return newObj;
  }
  
  return obj;
};

// Get all shared links for the logged-in user
export const getUserSharedLinksController = async (context) => {
  try {
    const { userId } = context.state.roleData;
    
    // Get user's shared links
    const sharedLinks = await getSharedLinksByUserId(userId);
    
    // Process BigInt values before sending response
    const processedLinks = processBigIntValues(sharedLinks);
    
    // Set content type header
    context.response.headers.set('Content-Type', 'application/json');
    context.response.status = 200;
    context.response.body = processedLinks;
  } catch (error) {
    console.error('Error in getUserSharedLinksController:', error);
    const status = error.status || 500;
    context.response.status = status;
    // Set content type header
    context.response.headers.set('Content-Type', 'application/json');
    context.response.body = { error: error.message };
    throw error;
  }
};

// Delete a shared link (expire it early)
export const deleteSharedLinkController = async (context) => {
  try {
    const { userId } = context.state.roleData;
    const shareId = context.params.shareId;
    
    if (!shareId) {
      const err = new Error('ValidationError: Share ID is required');
      err.status = 400;
      throw err;
    }
    
    // Delete the shared link with owner verification
    const deletedLink = await deleteSharedLink(shareId, userId);
    
    // Process BigInt values if needed
    const processedLink = processBigIntValues(deletedLink);
    
    // Set content type header
    context.response.headers.set('Content-Type', 'application/json');
    context.response.status = 200;
    context.response.body = { message: 'Shared link expired successfully', link: processedLink };
  } catch (error) {
    console.error('Error in deleteSharedLinkController:', error);
    const status = error.status || 500;
    context.response.status = status;
    // Set content type header
    context.response.headers.set('Content-Type', 'application/json');
    context.response.body = { error: error.message };
    throw error;
  }
};

export const updateBlockchainIdController = async (context) => {
  try {
    const { userId } = context.state.roleData;
    const fetchRequest = context.request.source;
    const rawBody = await fetchRequest.text();
    
    if (!rawBody) {
      throw new Error("Empty request body");
    }
    
    const requestBody = JSON.parse(rawBody);
    const { blockchainId } = requestBody;
    
    if (!blockchainId) {
      const err = new Error("ValidationError: Blockchain ID is required");
      err.status = 400;
      throw err;
    }
    
    // Update the user's blockchain ID
    const updatedUser = await updateUser(userId, {
      userIdOnBlockchain: blockchainId
    });
    
    // Process BigInt values if needed
    const processedUser = processBigIntValues(updatedUser);
    
    // Set content type header
    context.response.headers.set('Content-Type', 'application/json');
    context.response.status = 200;
    context.response.body = { 
      message: "Blockchain ID updated successfully", 
      user: processedUser 
    };
  } catch (error) {
    console.error("Error in updateBlockchainIdController:", error);
    const status = error.status || 500;
    context.response.status = status;
    // Set content type header
    context.response.headers.set('Content-Type', 'application/json');
    context.response.body = { error: error.message };
    throw error;
  }
};

export const uploadFileController = async (context) => {
  try {
    const { userId } = context.state.roleData;
    const fetchRequest = context.request.source;
    const rawBody = await fetchRequest.text();
    
    if (!rawBody) { 
      throw new Error('Empty request body'); 
    }
    
    const fileData = JSON.parse(rawBody);
    
    // Validate required fields
    if (!fileData.url || !fileData.fileuuid || !fileData.ipfsHash || !fileData.fileName) {
      const err = new Error('ValidationError: Missing required file data');
      err.status = 400;
      throw err;
    }
    
    // Create file record
    const newFile = await createFile({
      userId,
      url: fileData.url,
      fileuuid: fileData.fileuuid,
      expirationTime: fileData.expirationTime || 0,
      ipfsHash: fileData.ipfsHash,
      fileName: fileData.fileName,
      fileType: fileData.fileType || 'application/octet-stream',
      fileSize: fileData.fileSize || 0
    });
    
    // Process BigInt values before sending response
    const processedFile = processBigIntValues(newFile);
    
    // Set content type header
    context.response.headers.set('Content-Type', 'application/json');
    context.response.status = 201;
    context.response.body = processedFile;
  } catch (error) {
    console.error('Error in uploadFileController:', error);
    const status = error.status || 500;
    context.response.status = status;
    // Set content type header
    context.response.headers.set('Content-Type', 'application/json');
    context.response.body = { error: error.message };
    throw error;
  }
};

// Get files for the logged-in user
export const getUserFilesController = async (context) => {
  try {
    const { userId } = context.state.roleData;
    
    // Get user's files
    const files = await getFilesByUserId(userId);
    
    // Process BigInt values before sending response
    const processedFiles = processBigIntValues(files);
    
    // Set content type header
    context.response.headers.set('Content-Type', 'application/json');
    context.response.status = 200;
    context.response.body = processedFiles;
  } catch (error) {
    console.error('Error in getUserFilesController:', error);
    const status = error.status || 500;
    context.response.status = status;
    // Set content type header
    context.response.headers.set('Content-Type', 'application/json');
    context.response.body = { error: error.message };
    throw error;
  }
};

// Delete a file
export const deleteFileController = async (context) => {
  try {
    const { userId } = context.state.roleData;
    const fileId = context.params.id;
    
    if (!fileId) {
      const err = new Error('ValidationError: File ID is required');
      err.status = 400;
      throw err;
    }
    
    // Delete file (should verify ownership in the model)
    const deletedFile = await deleteFile(fileId, userId);
    
    // Process BigInt values
    const processedFile = processBigIntValues(deletedFile);
    
    // Set content type header
    context.response.headers.set('Content-Type', 'application/json');
    context.response.status = 200;
    context.response.body = { message: 'File deleted successfully', file: processedFile };
  } catch (error) {
    console.error('Error in deleteFileController:', error);
    const status = error.status || 500;
    context.response.status = status;
    // Set content type header
    context.response.headers.set('Content-Type', 'application/json');
    context.response.body = { error: error.message };
    throw error;
  }
};

// Create a shared link with expiration
// Enhanced createShareLinkController with more debugging
export const createShareLinkController = async (context) => {
  try {
    const { userId } = context.state.roleData;
    const fetchRequest = context.request.source;
    const rawBody = await fetchRequest.text();
    
    console.log("Raw share link request body:", rawBody);
    
    if (!rawBody) { 
      throw new Error('Empty request body'); 
    }
    
    // Parse and debug the request body
    let parsedBody;
    try {
      parsedBody = JSON.parse(rawBody);
      console.log("Parsed share link request:", parsedBody);
    } catch (parseError) {
      console.error("Error parsing JSON request body:", parseError);
      throw new Error('Invalid JSON in request body');
    }
    
    const { fileId, expirationHours } = parsedBody;
    console.log("Extracted fileId:", fileId, "Type:", typeof fileId);
    console.log("Extracted expirationHours:", expirationHours);
    
    if (fileId === undefined || fileId === null) {
      const err = new Error('ValidationError: File ID is required');
      err.status = 400;
      throw err;
    }
    
    // Convert fileId to number if it's a string but contains only digits
    const numericFileId = typeof fileId === 'string' && /^\d+$/.test(fileId) 
      ? parseInt(fileId, 10) 
      : fileId;
      
    console.log("Using fileId (possibly converted):", numericFileId);
    
    // Default expiration to 24 hours if not specified
    const expiration = expirationHours || 24;
    
    // Create shared link
    const sharedLink = await createSharedFileLink(numericFileId, userId, expiration);
    
    // Process BigInt values and ensure dates are strings
    const processedLink = processBigIntValues(sharedLink);
    
    // Log the processed link to verify it contains shareId
    console.log("Processed share link data:", JSON.stringify(processedLink));
    
    // Set content type header
    context.response.headers.set('Content-Type', 'application/json');
    context.response.status = 201;
    context.response.body = processedLink;
  } catch (error) {
    console.error('Error in createShareLinkController:', error);
    const status = error.status || 500;
    context.response.status = status;
    // Set content type header
    context.response.headers.set('Content-Type', 'application/json');
    context.response.body = { error: error.message };
    throw error;
  }
};

// Get a shared file (public endpoint, no auth required)
export const getSharedFileController = async (context) => {
  try {
    const shareId = context.params.shareId;
    
    if (!shareId) {
      const err = new Error('ValidationError: Share ID is required');
      err.status = 400;
      throw err;
    }
    
    // Get shared file
    const sharedFile = await getSharedFileByShareId(shareId);
    
    // Process BigInt values
    const processedFile = processBigIntValues(sharedFile);
    
    // Set content type header
    context.response.headers.set('Content-Type', 'application/json');
    context.response.status = 200;
    context.response.body = processedFile;
  } catch (error) {
    console.error('Error in getSharedFileController:', error);
    let status = error.status || 500;
    
    if (error.message === 'SharedFileExpiredOrNotFound') {
      status = 404;
    }
    
    context.response.status = status;
    // Set content type header
    context.response.headers.set('Content-Type', 'application/json');
    context.response.body = { error: error.message };
    throw error;
  }
};


export const signUpUserController = async (context) => {
  const fetchRequest = context.request.source;
  const rawBody = await fetchRequest.text();
  if (!rawBody) {
    throw new Error("Empty request body");
  }
  const requestBody = JSON.parse(rawBody);
  const { email, username, password } = requestBody;
  if (!email || !username || !password) {
    throw new Error("ValidationError");
  }
  const existingUser = await getUserByEmail(email);
  if (existingUser) {
    const err = new Error("ValidationError" + "userAlreadyExists");
    err.status = 400;
    throw err;
  }
  if (await checkUserName(username)) {
    const err = new Error("username already exists");
    err.status = 400;
    throw err;
  }
  const { otp, secret } = middleWares.generateOtp();
  const id = middleWares.generateUniqueId();
  tempStore.set(id, {
    otp,
    email,
    secret,
    pass: await middleWares.hashPass(password),
    username,
    action: "signUp",
  });

  setTimeout(() => tempStore.delete(id), 600000); // Set expiration to 10 minutes
  const message = `Your OTP is ${otp}. Click this link for signup verification: ${Deno.env.get(
    "VERIFYLINK"
  )}?id=${id}`;
  await middleWares.sendEMail(email, "signupVerify", message);
  context.response.status = 200;
  context.response.body = { message: "OTP sent to email", id: id };
};

//verify signup
//import * as middleWares from './middlewares/index.js';

export const verifyController = async (context) => {
  try {
    const fetchRequest = context.request.source;
    const rawBody = await fetchRequest.text();
    if (!rawBody) {
      throw new Error("Empty request body");
    }

    const requestBody = JSON.parse(rawBody);
    const { otp, id } = requestBody;

    if (!id || !otp) {
      const err = new Error("ValidationError: Id or OTP not provided");
      err.status = 400;
      throw err;
    }

    if (!tempStore.has(id)) {
      const err = new Error("ValidationError: OTP expired or invalid");
      err.status = 400;
      throw err;
    }

    const data = tempStore.get(id);

    // Add debugging to see what's happening
    console.log("Received OTP:", otp);
    console.log("Stored secret:", data.secret);

    // Verify OTP with more flexible window
    if (!middleWares.verifyOtp(data.secret, otp)) {
      const err = new Error("ValidationError: Invalid OTP");
      err.status = 400;
      throw err;
    }

    if (data.action === "signUp") {
      const userData = {
        email: data.email,
        userName: data.username,
        password: data.pass,
      };

      const createdData = await createUser(userData);
      userData.userId = createdData.userid;
      tempStore.delete(id);

      // Generate token but don't set as a cookie
      const token = await middleWares.createToken(userData);

      // Send token in the response for frontend to store
      context.response.status = 200;
      context.response.body = {
        message: "SignUpSuccessLoginned",
        userId: userData.userId,
        token: token,
      };
    }
  } catch (error) {
    console.error("Verification error:", error);
    const status = error.status || 500;
    context.response.status = status;
    context.response.body = { error: error.message };
    throw error;
  }
};

//signin
/*
const client = new OAuth2Client(Deno.env.get('GOOGLE_CLIENT_ID'));

export const googleSignInController = async (context) => {
  const { idToken } = await context.request.body().value;

  if (!idToken) {
    throw new Error('ValidationError: ID token is required');
  }

  const ticket = await client.verifyIdToken({
    idToken,
    audience: env.get('GOOGLE_CLIENT_ID'),
  });

  const { email, name: username, sub: googleId } = ticket.getPayload();

  let user = await userModels.getUserByEmailModel(email);

  if (!user) {
    user = await userModels.createUser({
      email,
      userName: username,
      googleId,
      userIdOnBlockchain: 'generated-blockchain-id', // Placeholder
      files: [],
      referenceLocation: 'default-location',
      dataSharable: true
    });
  }

  context.response.status = 200;
  context.response.cookies.set('token', await middleWares.createToken(user), { httpOnly: true });
  context.response.body = 'LoginSuccess';
};
*/

//login

// Update the loginUserController function
export const loginUserController = async (context) => {
  const fetchRequest = context.request.source;
  const rawBody = await fetchRequest.text();
  if (!rawBody) {
    throw new Error("Empty request body");
  }
  const requestBody = JSON.parse(rawBody);
  const { email, password } = requestBody;

  if (!email || !password) {
    const err = new Error(
      "ValidationError: Both email and password are required"
    );
    err.status = 400;
    throw err;
  }

  const user = await getUserByEmail(email);

  if (!user) {
    const err = new Error("ValidationError: User does not exist");
    err.status = 400;
    throw err;
  }

  const validPassword = await middleWares.validatePassword(
    password,
    user.password
  );

  if (!validPassword) {
    const err = new Error("ValidationError: Invalid password");
    err.status = 400;
    throw err;
  }

  // Generate token but don't set it as a cookie
  const token = await middleWares.createToken({
    email: user.email,
    userName: user.username,
    password: user.password,
    userId: user.userid,
  });

  context.response.status = 200;
  // Instead of setting a cookie, return the token in the response
  context.response.body = {
    message: "LoginSuccess",
    userId: user.userid,
    token: token,
  };
};

//logout
export const logoutUserController = (context) => {
  // No need to delete cookies since we're not using them
  // The frontend will handle clearing localStorage

  context.response.status = 200;
  context.response.body = { message: "LogoutSuccess" };
};
// forgot password
export const forgotPasswordController = async (context) => {
  const fetchRequest = context.request.source;
  const rawBody = await fetchRequest.text();
  if (!rawBody) {
    throw new Error("Empty request body");
  }
  const requestBody = JSON.parse(rawBody);
  const { email } = requestBody;

  if (!email) {
    const err = new Error("EmailRequired");
    err.status = 400;
    throw err;
  }

  try {
    const user = await getUserByEmail(email);
    if (!user) {
      const err = new Error("User doesn't exist");
      err.status = 400;
      throw err;
    }

    const resetId = middleWares.generateUniqueId();
    tempStore.set(
      resetId,
      JSON.stringify({ email: email, userId: user.userid })
    );
    setTimeout(() => tempStore.delete(resetId), 600 * 1000);
    const resetLink = `${Deno.env.get("RESETLINK")}/${resetId}`;
    await middleWares.sendEMail(
      email,
      "resetPass",
      `Click this link to reset your password: ${resetLink}`
    );
    context.response.status = 200;
    context.response.body = { message: "ResetLinkSent" };
  } catch (err) {
    throw err;
  }
};

//reset password
export const resetPasswordController = async (context) => {
  const fetchRequest = context.request.source;
  const rawBody = await fetchRequest.text();
  if (!rawBody) {
    throw new Error("Empty request body");
  }
  const requestBody = JSON.parse(rawBody);
  const { email } = requestBody;

  if (!email) {
    throw new Error("Email required");
  }

  const { userId } = context.state.roleData;
  const user = await getUserById(userId);
  if (user.email !== email) {
    const err = new Error("forbidden");
    err.status = 403;
    throw err;
  }
  const resetId = middleWares.generateUniqueId();
  tempStore.set(resetId, JSON.stringify({ userId: userId }));
  setTimeout(() => tempStore.delete(resetId), 600000);

  const resetLink = `${Deno.env.get("RESETLINK")}/${resetId}`;
  const message = `Click this link to reset your password: ${resetLink}`;
  await middleWares.sendEMail(email, "resetPass", message);
  context.response.status = 200;
  context.response.body = { success: true, id: id };
};

//reset pass verify
export const verifyResetPasswordController = async (context) => {
  const fetchRequest = context.request.source;
  const rawBody = await fetchRequest.text();
  if (!rawBody) {
    throw new Error("Empty request body");
  }
  const requestBody = JSON.parse(rawBody);
  const { resetId, newPassword } = requestBody;

  if (!resetId || !newPassword) {
    throw new Error("Reset ID and new password are required");
  }
  const data = JSON.parse(tempStore.get(resetId) || "{}");
  if (!data.userId) {
    throw new Error("Reset link expired");
  }

  const updatedUser = await updateUser(data.userId, {
    password: await middleWares.hashPass(newPassword),
  });
  console.log(updatedUser);
  context.response.status = 200;
  context.response.body = updatedUser;
};

export const updateUserController = async (context) => {
  const fetchRequest = context.request.source;
  const rawBody = await fetchRequest.text();
  if (!rawBody) {
    throw new Error("Empty request body");
  }
  const requestBody = JSON.parse(rawBody);
  const { newUserData } = requestBody;
  const { userId } = context.state.roleData;

  if (!userId || !newUserData) {
    const err = new Error("ValidationError: No UserId or New Data Provided");
    err.status = 400;
    throw err;
  }

  try {
    // Check if user exists
    const userExists = await getUserById(userId);
    if (!userExists) {
      const err = new Error("UserNotFound");
      err.status = 404;
      throw err;
    }
    if (newUserData.email) {
      const existingUserByEmail = await getUserByEmail(newUserData.email);
      if (existingUserByEmail && existingUserByEmail.userId !== userId) {
        const err = new Error("ValidationError: Email already in use");
        err.status = 400;
        throw err;
      }
    } // Check if username is unique
    if (newUserData.userName) {
      const existingUserByUsername = await checkUserName(newUserData.userName);
      if (existingUserByUsername) {
        const err = new Error("ValidationError: Username already in use");
        err.status = 400;
        throw err;
      }
    }
    // Remove password if present in newUserData
    if (newUserData.password) {
      delete newUserData.password;
    }

    // Update user data
    const updated = await updateUser(userId, newUserData);
    context.response.status = 200;
    context.response.body = updated;
  } catch (err) {
    console.error("Error in updateUserController:", err);
    err.status = err.status || 500;
    throw err;
  }
};

export const saveMedicalInfoController = async (context) => {
  try {
    const { userId } = context.state.roleData;
    const fetchRequest = context.request.source;
    const rawBody = await fetchRequest.text();
    
    if (!rawBody) {
      throw new Error('Empty request body');
    }
    
    // Parse the request body
    const requestBody = JSON.parse(rawBody);
    
    // Extract the medical info data
    const medicalData = {
      medical_condition: requestBody.medicalCondition,
      medical_background: requestBody.medicalBackground,
      share_data: requestBody.shareData
    };
    
    // Save the medical info
    const savedInfo = await createOrUpdateMedicalInfo(userId, medicalData);
    
    // Process the response for proper JSON serialization
    const processedInfo = processBigIntValues(savedInfo);
    
    // Return the saved info
    context.response.headers.set('Content-Type', 'application/json');
    context.response.status = 200;
    context.response.body = processedInfo;
  } catch (error) {
    console.error('Error in saveMedicalInfoController:', error);
    const status = error.status || 500;
    context.response.status = status;
    context.response.headers.set('Content-Type', 'application/json');
    context.response.body = { error: error.message };
    throw error;
  }
};

export const getMedicalInfoController = async (context) => {
  try {
    const { userId } = context.state.roleData;
    
    // Get the medical info
    const medicalInfo = await getMedicalInfoByUserId(userId);
    
    // Process the response for proper JSON serialization
    const processedInfo = processBigIntValues(medicalInfo || {});
    
    // Return the medical info
    context.response.headers.set('Content-Type', 'application/json');
    context.response.status = 200;
    context.response.body = processedInfo;
  } catch (error) {
    console.error('Error in getMedicalInfoController:', error);
    const status = error.status || 500;
    context.response.status = status;
    context.response.headers.set('Content-Type', 'application/json');
    context.response.body = { error: error.message };
    throw error;
  }
};

export const deleteMedicalInfoController = async (context) => {
  try {
    const { userId } = context.state.roleData;
    
    // Delete the medical info
    const deletedInfo = await deleteMedicalInfoByUserId(userId);
    
    // Return success message
    context.response.headers.set('Content-Type', 'application/json');
    context.response.status = 200;
    context.response.body = { 
      message: 'Medical info deleted successfully',
      deletedInfo: processBigIntValues(deletedInfo || {})
    };
  } catch (error) {
    console.error('Error in deleteMedicalInfoController:', error);
    const status = error.status || 500;
    context.response.status = status;
    context.response.headers.set('Content-Type', 'application/json');
    context.response.body = { error: error.message };
    throw error;
  }
};

export const deleteUserController = async (context) => {
  try {
    const { userId } = context.state.roleData;

    if (!userId) {
      const err = new Error("ValidationError: UserId Required");
      err.status = 400;
      throw err;
    }
    // Check if user exists
    const user = await getUserById(userId);
    console.log(user);
    if (!user) {
      const err = new Error("UserNotFound");
      err.status = 404;
      throw err;
    }

    // Delete user
    await deleteUser(userId);
    context.response.status = 200;
    context.response.body = { message: "UserDeleted" };
  } catch (err) {
    console.error("Error in deleteUserController:", err);
    err.status = err.status || 500;
    throw err;
  }
};

export const getUserData = async (context) => {
  try {
    const { userId } = context.state.roleData;
    if (!userId) {
      const err = new Error("ValidationError: UserId Required");
      err.status = 400;
      throw err;
    }

    const user = await getUserById(userId);
    if (!user) {
      const err = new Error("UserNotFound");
      err.status = 404;
      throw err;
    }

    context.response.status = 200;
    context.response.body = user;
  } catch (err) {
    console.error("Error in getUserData:", err);
    err.status = err.status || 500;
    throw err;
  }
};
export const getAllUserController = async (context) => {
  try {
    const users = await getAllUsers();
    context.response.status = 200;
    context.response.body = users;
  } catch (err) {
    console.error("Error in getAllUserController:", err);
    err.status = err.status || 500;
    throw err;
  }
};

export default {
  forgotPasswordController,
  loginUserController,
  logoutUserController,
  signUpUserController,
  verifyController,
  verifyResetPasswordController,
  resetPasswordController,
  updateUserController,
  deleteUserController,
  getAllUserController,
  getUserData,
  uploadFileController,
  getUserFilesController,
  deleteFileController,
  createShareLinkController,
  getSharedFileController,
  getUserSharedLinksController,
  deleteSharedLinkController,
  updateBlockchainIdController,
  saveMedicalInfoController,
  getMedicalInfoController,
  deleteMedicalInfoController
};
