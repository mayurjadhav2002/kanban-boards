var bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const randomstring = require('randomstring');
const { VerifyEmail } = require('../config/mails');
const { OAuth2Client } = require('google-auth-library');
const Project = require('../models/Project');
const Documentation = require('../models/Documentation');
const { default: mongoose } = require('mongoose');
const client_id = process.env.GOOGLE_AUTH_CLIENT_ID;
const client = new OAuth2Client(client_id);

const dbStats = async () => {
    try {
        // Use the dbStats command to get the storage statistics
        const stats = await mongoose.connection.db.command({ dbStats: 1, scale: 1024 }); // scale: 1024 to get sizes in KB
        return stats;
    } catch (error) {
        // console.error("Error fetching dbStats:", error);
        throw error;
    }
}

// jwt token generation, whenever user sign in this token will be send.
const token_generation = async (id) => {
    try {
        const token = await jwt.sign({ _id: id }, process.env.JWT_SECRET_KEY);
        return token;

    } catch (error) {
        throw new Error(error)
    }
}
async function AccounVerificationToken() {
    try {
        return randomstring.generate();
    } catch (error) {
        res.status(400).send({ msg: "error in token generation" })
    }
}

const password_encrypt = async (password) => {
    try {
        const pass = await bcrypt.hash(password, 10);
        return pass;
    } catch (error) {
        // Throw an error or return a rejected promise
        throw new Error(error.message);
    }
};


const register_new_user = async (req, res) => {
    const email = req.body.email;

    try {
        const encrypt_pass = await password_encrypt(req.body.password);

        // Checking whether user with given email already exists or not
        const userExists = await User.findOne({ email: email });
        if (userExists) {
            return res.status(201).send({ success: false, code: "exists", msg: "User with this email already exists" });
        }

        const account_verification_token = await AccounVerificationToken();
        const user = new User({
            name: req.body.name,
            email: email,
            password: encrypt_pass,
            tc: req.body.tc,
            verification_token: account_verification_token,
            signInType: [{ normal: true }]
        });

        const result = await user.save();

        if (result) {
            const token = await token_generation(result._id);
            let user2 = await User.findOneAndUpdate({ email: result.email }, { access_token: token }, {
                new: true
            });
            // Send the response first
            res.status(201).send({ success: true, code: "success", msg: "New Account Created", data: user2 });

            // Then handle the asynchronous operation
            await VerifyEmail({ token: account_verification_token, email: email });
        } else {
            res.status(400).send({ success: false, code: "error", msg: "Error in creating the account" });
        }
    } catch (error) {
        res.status(500).send({ success: false, code: 'internal error', msg: "Internal error occurred" });
    }
}


const signin = async (req, res) => {
    const email = req.body.email;
    // Check whether the user exists or not
    try {
        if (req.body.password === '') {
            return res.status(400).send({ succes: false, msg: "please check your credentials", typeError: "Password" })
        }
        let user = await User.findOne({ email: req.body.email });
        if (!user) {
            return res.status(201).send({ success: false, msg: "User Not exists" })
        }
        if (!user.signInType[0].normal) {
            return res.status(201).send({ success: false, code: "oauth", msg: "Please Sign in using Google or github" })
        }


        if (!user.verified_account) {
            return res.status(201).send({ success: false, code: "unverified", msg: "Email not Verified" })
        }
        // If user Exists

        const password_Verify = await bcrypt.compare(req.body.password, user.password);

        if (password_Verify) {
            const token = await token_generation(user._id);
            user = await User.findOneAndUpdate({ email: email }, { access_token: token }, {
                new: true
            });
            const userAccount = {
                _id: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                verified_account: user.verified_account,
                organization: user.organization,
                organization_name: user.organization_name,
                access_token: token
            };
            return res.status(200).send({ success: true, data: userAccount });


        } else {
            return res.status(406).send({ success: false, code: "invalid", msg: `Incorrect Login Credentials` });
        }

    } catch (error) {
        return res.status(500).send({ success: false, code: "error", msg: "Failed to load, some errored occured" });
    }
}

const verifyEmail = async (req, res) => {
    try {
        let user = await User.findOne({ email: email });
        if (!user) {
            return res.status(400).send({ success: false, msg: "User Not exists" })
        }
        if (user.verification_token === req.body.verification_token) {
            user = await User.findOneAndUpdate({ email: email }, { verified_account: true }, {
                new: true
            });
            return res.status(200).send({ success: true, msg: "Account Verified" })
        }
        if (user.verification_token !== req.body.verification_token) {
            return res.status(400).send({ success: false, msg: `Verification token is Expired or Does not match.` });
        }

    } catch (error) {
        return res.status(500).send({ success: false, msg: "Failed to load, some errored occured" });
    }
}

const create_user_using_gauth = async (req, res) => {
    try {
        const jwtToken = req.body.credentials;
        const ticket = await client.verifyIdToken({
            idToken: jwtToken,
            audience: client_id,
        });

        const payload = ticket.getPayload();

        let token_generator = await User.findOne({ email: payload.email });


        if (payload) {
            if (token_generator) {
                const token = await token_generation(token_generator._id);
                const user = await User.findOneAndUpdate({ email: payload.email }, { access_token: token }, {
                    new: true
                });

                const userAccount = {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    avatar: user.avatar,
                    verified_account: user.verified_account,
                    organization: user.organization,
                    organization_name: user.organization_name,
                    access_token: user.access_token
                };
                return res.status(200).send({ success: true, msg: "Login successfully", data: userAccount });
            } else {

                const guser = new User({
                    name: payload.name,
                    email: payload.email,
                    avatar: payload.picture,
                    tc: true,
                    signInType: [{ google: true }],
                    verified_account: payload.email_verified,
                });
                const userSaveResult = await guser.save()
                if (userSaveResult) {
                    const newToken = await User.findOne({ email: userSaveResult.email, delete_account: false })
                    const token = await token_generation(newToken._id);
                    const user = await User.findOneAndUpdate({ email: userSaveResult.email }, { access_token: token }, {
                        new: true
                    });
                    const userAccount = {
                        _id: user._id,
                        name: user.name,
                        email: user.email,
                        avatar: user.avatar,
                        verified_account: user.verified_account,
                        organization: user.organization,
                        organization_name: user.organization_name,
                        access_token: user.access_token
                    };
                    return res.status(200).send({ success: true, msg: "account created successfully", data: userAccount });
                }
                else {
                    return res.status(400).send({ succes: false, msg: "some error occured while creating new user with google" })
                }




            }




        }



    } catch (error) {
        // console.error("Error:", error);
        return res.status(500).send({ success: false, msg: "Failed to load, some error occurred" });

    }

}

const getCountofUserActivity = async (req, res) => {
    try {
        const userId = req.params.id;
        
        // Count user's projects
        const ProjectCount = await Project.countDocuments({ created_by: userId, deleted: false });

        // Count user's documents
        const DocumentsCount = await Documentation.countDocuments({ created_by: userId, deleted: false });

        // Get database stats
        const stats = await dbStats();

        // Calculate storage stats for projects and documents
        const projectStorageStats = ProjectCount * stats.storageSize;
        const documentsStorageStats = DocumentsCount * stats.storageSize;

        // Count shared documents
        const SharedDocuments = await Documentation.countDocuments({
            shared_with: userId,
        });

        // Fetch recently edited documentations (adjust the sort and limit as needed)
        const recentlyEditedDocs = await Documentation.find({
            created_by: userId,
        }).select('docID document_title updatedAt').sort({ updatedAt: 'desc' }).limit(5);

        // Fetch names and dates of up to 5 shared projects
        const sharedProjects = await Project.find({
            'collaborators.userId': userId,
            deleted: false,
        }).select('title description timeline createdAt keyword _id created_by').populate('created_by', 'name avatar').limit(5);

        
        

        return res.status(200).send({
            success: true,
            projectCount: ProjectCount,
            documentCount: DocumentsCount,
            sharedDocuments: SharedDocuments,
            projectStorageStats: projectStorageStats,
            documentsStorageStats: documentsStorageStats,
            sharedProjects: sharedProjects,
            recentlyEditedDocs: recentlyEditedDocs,
        });
    } catch (error) {
        // console.error("Error occurred while fetching user activity", error);
        return res.status(500).send({ success: false, msg: "Failed to load, some error occurred" });
    }
}

module.exports = { getCountofUserActivity };


module.exports = { register_new_user, signin, verifyEmail, create_user_using_gauth, getCountofUserActivity }
