import { create,verify,getNumericDate }  from 'djwt';
import {hash,compare,genSalt} from 'bcrypt';
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
    const salt = await genSalt(10);
      
      return await hash(password, salt);
   
     }
   catch (err) {
     throw new Error('Error while hashing password'+err);
    }}
  export const validatePassword = async (pass, dbPass) => {
    try {
      return await compare(pass, dbPass);
    } catch (err) {
      throw new Error(`passwordValidation Error ${err}`);
    }
  };
  
  //sendmail

export const sendEMail = async (email, subject, message) => {
  try {
    const client = new SMTPClient({ connection: { 
      hostname: "smtp.gmail.com",
       port: 465,
        tls: true,
         auth: {
           username: Deno.env.get("MYMAIL"),
            password: Deno.env.get("MAILPASS"),
           },
           },});
  await client.send({ from: Deno.env.get('MYMAIL'),
     to: email, 
     subject: subject, 
     content: message});


    await client.close();
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
