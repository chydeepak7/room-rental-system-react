import {
  USER_LOGIN_REQUEST,
  USER_LOGIN_SUCCESS,
  USER_LOGIN_FAIL,
  USER_LOGOUT,

  USER_REGISTER_SUCCESS,
  USER_REGISTER_FAIL,
  USER_REGISTER_REQUEST,

    
    VERIFY_REGISTER_SUCCESS,
    VERIFY_REGISTER_REQUEST,
    VERIFY_REGISTER_FAIL

} from "../constants/userConstants";
import axios from "axios";
import { backendUrl } from "../constants/userConstants";
import swal from "sweetalert2";
// import { useNavigate } from "react-router-dom";

export const login = (email, password) => async (dispatch) => {
  //   const navigate = useNavigate();
  try {
    dispatch({
      type: USER_LOGIN_REQUEST,
    });
    const config = {
      headers: {
        "Content-type": "application/json",
      },
    };
    const { data } = await axios.post(
      `${backendUrl}/user/login/`,
      { username: email, password: password },
      config
    );

    dispatch({
      type: USER_LOGIN_SUCCESS,
      payload: data,
    });
    localStorage.setItem("userInfo", JSON.stringify(data));

    swal.fire({
      title: "Login Successful",
      icon: "success",
      toast: true,
      timer: 3000,
      position: "top-right",
      timerProgressBar: true,
      showConfirmButton: false,
    });
    // navigate("/home");
  } catch (error) {
    dispatch({
      type: USER_LOGIN_FAIL,
      payload: error.message,
    });

    swal.fire({
      title: "Login Failed",
      text:
        error.response && error.response.data.detail
          ? error.response.data.detail
          : "An error occurred during login",
      icon: "error",
      toast: true,
      timer: 2000,
      position: "top-right",
      timerProgressBar: true,
      showConfirmButton: false,
    });
    // navigate("/");
  }
};

export const logout = () => (dispatch) => {
  localStorage.removeItem("userInfo");
  dispatch({
    type: USER_LOGOUT,
  });
};

export const register =
  (email, password, username, name, phone_number, userType) =>
  async (dispatch) => {
    try {
      dispatch({
        type: USER_REGISTER_REQUEST,
      });
      const config = {
        headers: {
          "Content-type": "application/json",
        },
      };
      const { data } = await axios.post(
        `${backendUrl}/user/register/`,
        {
          name: name,
          password: password,
          email: email,
          username: username,
          phone_number: phone_number,
          userType: userType,
        },
        config
      );

      dispatch({
        type: USER_REGISTER_SUCCESS,
        payload: data,
      });
      dispatch({
        type: USER_LOGIN_SUCCESS,
        payload: data,
      });

      localStorage.setItem("userInfo", JSON.stringify(data));
    } catch (error) {
      dispatch({
        type: USER_REGISTER_FAIL,
        payload:
          error.response && error.response.data
            ? error.response.data.detail || error.message
            : error.message,
      });
    
  };
};

export const verifyRegister = (formData) => async (dispatch) => {
    try {
        dispatch({ type: VERIFY_REGISTER_REQUEST });

        const token = JSON.parse(localStorage.getItem("userInfo"))?.access; // Fetch token from localStorage

        
        if (!token) {
            throw new Error("No authorization token found");
        }

        const config = {
            headers: {
                'Content-Type': 'multipart/form-data', // Set content type for file uploads
                Authorization: `Bearer ${token}`, // Include the authorization token
            },
        };

        // Make the POST request with FormData
        const { data } = await axios.post(`${backendUrl}/user/verify/`, formData, config);
        
        dispatch({ type: VERIFY_REGISTER_SUCCESS, payload: data }); // Dispatch success
    } catch (error) {
        console.error('Error details:', error); // Log errors for debugging
        if (error.response) {
            console.error('Error response:', error.response.data);
            console.error('Status:', error.response.status);
        }
        dispatch({
            type: VERIFY_REGISTER_FAIL,
            payload: error.response?.data?.detail || error.message,
        });
    }
};
