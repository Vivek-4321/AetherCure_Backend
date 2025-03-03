import { Router } from "oak";
import middleWares from "./middleWare.js";
import controllers from "./controller.js";
const userRouter = new Router();
export const fileRouter = new Router();
const symptomRouter = new Router();
export const authRouter = new Router();
export const medicalInfoRouter = new Router();

// Medical info routes
medicalInfoRouter.post(
  "/medical-info",
  middleWares.errorHandler,
  middleWares.authenticate,
  controllers.saveMedicalInfoController
);

medicalInfoRouter.get(
  "/medical-info",
  middleWares.errorHandler,
  middleWares.authenticate,
  controllers.getMedicalInfoController
);

medicalInfoRouter.delete(
  "/medical-info",
  middleWares.errorHandler,
  middleWares.authenticate,
  controllers.deleteMedicalInfoController
);

authRouter.post(
  "/logout",
  middleWares.authenticate,
  controllers.logoutUserController
);
authRouter.post(
  "/forgotPass",
  middleWares.errorHandler,
  controllers.forgotPasswordController
);
authRouter.post(
  "/signUp",
  middleWares.errorHandler,
  controllers.signUpUserController
);
authRouter.post(
  "/verify",
  middleWares.errorHandler,
  controllers.verifyController
);
authRouter.post(
  "/login",
  middleWares.errorHandler,
  controllers.loginUserController
);
authRouter.post(
  "/resetPassword",
  middleWares.errorHandler,
  middleWares.authenticate,
  controllers.resetPasswordController
);
authRouter.post(
  "/resetPassVerify",
  middleWares.errorHandler,
  controllers.verifyResetPasswordController
);
authRouter.put(
  "/update",
  middleWares.errorHandler,
  middleWares.authenticate,
  controllers.updateUserController
);
authRouter.delete(
  "/delete",
  middleWares.errorHandler,
  middleWares.authenticate,
  controllers.deleteUserController
);
authRouter.get(
  "/getAllUsers",
  middleWares.errorHandler,
  middleWares.authenticate,
  controllers.getAllUserController
);
authRouter.get(
  "/getUser",
  middleWares.errorHandler,
  middleWares.authenticate,
  controllers.getUserData
);

authRouter.post(
  "/updateBlockchainId",
  middleWares.errorHandler,
  middleWares.authenticate,
  controllers.updateBlockchainIdController
);
//authRouter.post('/gSignIn',userController.googleSignInController);

fileRouter.post(
  "/files",
  middleWares.errorHandler,
  middleWares.authenticate,
  controllers.uploadFileController
);
fileRouter.get(
  "/files/user",
  middleWares.errorHandler,
  middleWares.authenticate,
  controllers.getUserFilesController
);
fileRouter.delete(
  "/files/:id",
  middleWares.errorHandler,
  middleWares.authenticate,
  controllers.deleteFileController
);
fileRouter.post(
  "/files/share",
  middleWares.errorHandler,
  middleWares.authenticate,
  controllers.createShareLinkController
);
// Route to get all user's shared links
fileRouter.get(
  "/files/shared/links",
  middleWares.errorHandler,
  middleWares.authenticate,
  controllers.getUserSharedLinksController
);

// Route to delete a shared link - this is needed for the "expire now" feature
fileRouter.delete(
  "/files/shared/:shareId",
  middleWares.errorHandler,
  middleWares.authenticate,
  controllers.deleteSharedLinkController
);
// Public route for accessing shared files (no auth required)
fileRouter.get(
  "/files/shared/:shareId",
  middleWares.errorHandler,
  controllers.getSharedFileController
);

/*
userRouter
  .get('/users', async (context) => {
    const users = await getUsers();
    context.response.body = users;
  })
  .get('/users/:id', async (context) => {
    const id = parseInt(context.params.id);
    const user = await getUserById(id);
    context.response.body = user;
  })
  .post('/users', async (context) => {
    const body = await context.request.body().value;
    const newUser = await createUser(body);
    context.response.body = newUser;
  })
  .put('/users/:id', async (context) => {
    const id = parseInt(context.params.id);
    const body = await context.request.body().value;
    const updatedUser = await updateUser(id, body);
    context.response.body = updatedUser;
  })
  .delete('/users/:id', async (context) => {
    const id = parseInt(context.params.id);
    await deleteUser(id);
    context.response.body = { message: 'User deleted successfully' };
  })
  .put()

// File Routes
fileRouter
  .get('/files', async (context) => {
    const files = await getFiles();
    context.response.body = files;
  })
  .get('/files/:id', async (context) => {
    const id = parseInt(context.params.id);
    const file = await getFileById(id);
    context.response.body = file;
  })
  .post('/files', async (context) => {
    const body = await context.request.body().value;
    const newFile = await createFile(body);
    context.response.body = newFile;
  })
  .put('/files/:id', async (context) => {
    const id = parseInt(context.params.id);
    const body = await context.request.body().value;
    const updatedFile = await updateFile(id, body);
    context.response.body = updatedFile;
  })
  .delete('/files/:id', async (context) => {
    const id = parseInt(context.params.id);
    await deleteFile(id);
    context.response.body = { message: 'File deleted successfully' };
  });

// Symptom Routes
symptomRouter
  .get('/symptoms', async (context) => {
    const symptoms = await getSymptoms();
    context.response.body = symptoms;
  })
  .get('/symptoms/:id', async (context) => {
    const id = parseInt(context.params.id);
    const symptom = await getSymptomById(id);
    context.response.body = symptom;
  })
  .post('/symptoms', async (context) => {
    const body = await context.request.body().value;
    const newSymptom = await createSymptom(body);
    context.response.body = newSymptom;
  })
  .put('/symptoms/:id', async (context) => {
    const id = parseInt(context.params.id);
    const body = await context.request.body().value;
    const updatedSymptom = await updateSymptom(id, body);
    context.response.body = updatedSymptom;
  })
  .delete('/symptoms/:id', async (context) => {
    const id = parseInt(context.params.id);
    await deleteSymptom(id);
    context.response.body = { message: 'Symptom deleted successfully' };
  });
*/
