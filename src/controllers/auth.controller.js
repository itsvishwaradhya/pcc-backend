import {
  registerUser,
  loginUser,
} from "../services/auth.service.js";

export const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const user = await registerUser({
      name,
      email,
      password,
      role,
    });

    res.status(201).json({
      message: "User registered successfully",
      user,
    });
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const { token, user } = await loginUser({
      email,
      password,
    });

    res
      .cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 24 * 60 * 60 * 1000,
      })
      .status(200)
      .json({
        message: "Login successful",
        user,
      });
  } catch (error) {
    res.status(401).json({
      message: error.message,
    });
  }
};

export const logout = async (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  res.status(200).json({
    message: "Logout successful",
  });
};