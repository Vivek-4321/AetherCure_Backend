import { create,verify,getNumericDate }  from 'djwt';
// import {hash,compare,genSalt} from 'bcrypt';
import * as OTPAuth from 'otpauth';
import { SMTPClient } from 'denomailer';
import {config} from "dotenv";
config({path:"../..//.env"});
// errorHandler.js
export const errorHandler = async(context, next) => {
  try {
    console.log('inerrorhandler middleware');
    await next();
  } catch (err) {
    let statusCode;
    let message;
console.log(err);
    if (err.message === 'DatabaseConnectionError') {
      statusCode = 500;
      message = 'Internal Server Error: Database connection failed.';
    } else if (err.message === 'ValidationError') {
      statusCode = 400;
      message = 'Bad Request: Validation error.';
    } else if (err.message === 'AuthenticationError') {
      statusCode = 401;
      message = 'Unauthorized: Authentication failed.';
    } else if (err.message === 'NotFoundError') {
      statusCode = 404;
      message = 'Not Found: The requested resource was not found.';
    } else {
        if(!err.statusCode){
        statusCode = err.statusCode;
      }  else {
        statusCode = 500;
      }
      message = err.message;
    }

    context.response.status = statusCode;
    context.response.body = { error: message };
  }
};

//authenticate 

// Update the authenticate middleware to use Authorization header instead of cookies
export const authenticate = async (context, next) => {
  // Get token from Authorization header
  const authHeader = context.request.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Unauthorized: No token provided');
  }
  
  const token = authHeader.split(' ')[1];
  
  if (!token) {
    throw new Error('Unauthorized: Invalid token format');
  }
  
  try {
    // Convert string key to CryptoKey object
    const encoder = new TextEncoder();
    const keyBuf = encoder.encode(Deno.env.get('PrivateOrSecretKey'));
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyBuf,
      { name: "HMAC", hash: "SHA-256" },
      true,
      ["sign", "verify"]
    );
    const payload = await verify(token, cryptoKey);
    context.state = context.state || {};
    context.state.roleData = payload;
    context.state.authenticated = true;
    await next();
  } catch (err) {
    if (err instanceof Error && err.message.includes('exp')) {
      throw new Error('Session expired. Please log in again.');
    }
    throw new Error(`Unauthorized: ${err.message}`);
  }
};
//generate otp 
export const generateOtp = () => { 
  const secret = new OTPAuth.Secret();
   const totp = new OTPAuth.TOTP({ secret: secret, algorithm: "SHA1", digits: 6, period: 600, }); 
   const token = totp.generate(); // Ensure to return the base32 encoded secret 
return { otp: token, secret: secret.base32 };
}

export const verifyOtp = (secret, otp) => {
  try {
    // More debugging
    console.log(`Verifying OTP: ${otp} with secret: ${secret}`);
    
    const totp = new OTPAuth.TOTP({ 
      algorithm: "SHA1", 
      digits: 6, 
      period: 600, // 10 minutes
      secret: OTPAuth.Secret.fromBase32(secret) 
    }); 
    
    // Use a larger window to account for time drift and delays
    // window: 2 means check current period and 1 period before and after
    const delta = totp.validate({ 
      token: otp.toString(), 
      window: 2
    });
    
    console.log('OTP validation result:', delta);
    
    return delta !== null; 
  } catch (error) {
    console.error('OTP verification error:', error);
    return false;
  }
};
  //hash and validate pass 
  export const hashPass = async (password) => {
    try {
      // Convert the password string to a buffer
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      
      // Generate a random salt
      const salt = crypto.getRandomValues(new Uint8Array(16));
      
      // Derive a key using PBKDF2
      const key = await crypto.subtle.importKey(
        "raw",
        data,
        { name: "PBKDF2" },
        false,
        ["deriveBits", "deriveKey"]
      );
      
      const derivedKey = await crypto.subtle.deriveKey(
        {
          name: "PBKDF2",
          salt,
          iterations: 100000,
          hash: "SHA-256"
        },
        key,
        { name: "HMAC", hash: "SHA-256", length: 256 },
        true,
        ["sign"]
      );
      
      // Export the key to raw format
      const keyBuffer = await crypto.subtle.exportKey("raw", derivedKey);
      
      // Combine salt and key
      const result = new Uint8Array(salt.length + keyBuffer.byteLength);
      result.set(salt, 0);
      result.set(new Uint8Array(keyBuffer), salt.length);
      
      // Convert to base64 for storage
      return btoa(String.fromCharCode(...result));
    } catch (err) {
      throw new Error('Error while hashing password: ' + err);
    }
  };  
  //sendmail

  export const validatePassword = async (password, storedHash) => {
    try {
      // Decode the stored hash
      const hashBuffer = Uint8Array.from(atob(storedHash), c => c.charCodeAt(0));
      
      // Extract the salt (first 16 bytes)
      const salt = hashBuffer.slice(0, 16);
      const storedKey = hashBuffer.slice(16);
      
      // Hash the provided password with the same salt
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      
      const key = await crypto.subtle.importKey(
        "raw",
        data,
        { name: "PBKDF2" },
        false,
        ["deriveBits", "deriveKey"]
      );
      
      const derivedKey = await crypto.subtle.deriveKey(
        {
          name: "PBKDF2",
          salt,
          iterations: 100000,
          hash: "SHA-256"
        },
        key,
        { name: "HMAC", hash: "SHA-256", length: 256 },
        true,
        ["sign"]
      );
      
      const keyBuffer = await crypto.subtle.exportKey("raw", derivedKey);
      const newKey = new Uint8Array(keyBuffer);
      
      // Compare the derived key with the stored key
      if (storedKey.length !== newKey.length) {
        return false;
      }
      
      // Time-constant comparison to prevent timing attacks
      let result = 0;
      for (let i = 0; i < storedKey.length; i++) {
        result |= storedKey[i] ^ newKey[i];
      }
      
      return result === 0;
    } catch (err) {
      throw new Error(`Password validation error: ${err}`);
    }
  };

  export const sendEMail = async (email, subject, message) => {
    try {
      // Example using Resend.com - you'd need to sign up for an API key
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'no-reply@aethercure.site',
          to: email,
          subject: subject,
          html: message
        })
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Email API error: ${JSON.stringify(errorData)}`);
      }
  
      return { message: 'Email sent successfully' };
    } catch (error) {
      console.error("Error in mailSending:", error);
      throw new Error("Error in mailSending: " + error.message);
    }
  };
  

  
export const generateUniqueId =  () => {
  return crypto.randomUUID().toString();
};
export const createToken = async (user) => {  
  const payload = {
   username: user.userName,
    email: user.email,
    userId:user.userId,
     password: user.password,
      exp: getNumericDate(60 * 60) 
    }
        const encoder = new TextEncoder();
      const keyBuf = encoder.encode(Deno.env.get('PrivateOrSecretKey'));
      const cryptoKey = await crypto.subtle.importKey(
        "raw",
        keyBuf,
        { name: "HMAC", hash: "SHA-256" },
        true,
        ["sign", "verify"]
      );
      try {
        const token = await create(
          { alg: "HS256", typ: "JWT" },
          payload,
          cryptoKey
        );
        return token;
      } catch(err) {
        console.error('Error creating token:', err);
        throw err;
      }
    }
    
    
export default { 
  errorHandler,
  generateOtp, 
  generateUniqueId,
  hashPass, 
  validatePassword, 
  sendEMail,
  createToken, 
  verifyOtp,
  authenticate
    };
