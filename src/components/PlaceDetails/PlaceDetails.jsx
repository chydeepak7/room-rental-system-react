import { useState, useEffect, useRef } from "react";
import { IoCall } from "react-icons/io5";
import { MdMessage } from "react-icons/md";
import axios from "axios";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { backendUrl } from "../../constants/userConstants.jsx";
import noImage from "../../assets/no_image.png";
import { v4 as uuidv4 } from "uuid";
import CryptoJS from "crypto-js";

const PlaceDetails = () => {
  const navigate = useNavigate();
  const token = JSON.parse(localStorage.getItem("userInfo"))?.access;
  const [rentFrom, setRentFrom] = useState("");
  const [rentTo, setRentTo] = useState("");
  const [dateDifference, setDateDifference] = useState(0);
  const [esewaData, setEsewaData] = useState({
    amount: "0",
    tax_amount: "0",
    total_amount: "0",
    transaction_uuid: uuidv4(),
    product_service_charge: "0",
    product_delivery_charge: "0",
    product_code: "EPAYTEST",
    success_url: "",
    failure_url: "http://localhost:5173/paymentfailure",
    signed_field_names: "total_amount,transaction_uuid,product_code",
    signature: "",
    secret: "8gBm/:&EnhH.1/q",
    rent_id: "0",
  });

  const roomDetails = useSelector((state) => state.roomDetails);
  const { rooms } = roomDetails;
  const { roomid } = useParams();
  const [room, setRoom] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchRoomDetails = async () => {
      try {
        setIsLoading(true);
        const { data } = await axios.get(`${backendUrl}/rooms/${roomid}/`);
        setRoom(data);
      } catch (error) {
        console.error("Error fetching room details:", error);
      } finally {
        setIsLoading(false);
      }
    };

    const roomFromStore = rooms.find((room) => room.id === Number(roomid));
    if (roomFromStore) {
      setRoom(roomFromStore);
    } else {
      fetchRoomDetails();
    }
  }, [roomid, rooms]);

  const generateSignature = (
    transaction_uuid,
    product_code,
    secret,
    total_amount
  ) => {
    const hashString = `total_amount=${total_amount},transaction_uuid=${transaction_uuid},product_code=${product_code}`;
    const hash = CryptoJS.HmacSHA256(hashString, secret);
    return CryptoJS.enc.Base64.stringify(hash);
  };

  const handleRent = async (e) => {
    e.preventDefault();
    if (!rentFrom || !rentTo) {
      alert("Please select the rental period.");
      return;
    }

    try {
      // Validate dates
      const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
      const selectedRentFrom = new Date(rentFrom);

      // Check if Rent From is today or later
      if (rentFrom < today) {
        alert("Please select a 'Rent From' date that is today or later.");
        return;
      }

      // Check if Rent To is at least one day after Rent From
      const nextDay = new Date(selectedRentFrom);
      nextDay.setDate(nextDay.getDate() + 1); // Calculate the next day after Rent From
      if (rentTo <= rentFrom || rentTo < nextDay.toISOString().split('T')[0]) {
        alert("Please select a 'Rent To' date that is at least one day after the 'Rent From' date.");
        return;
      }

      const formData = new FormData();
      formData.append("rent_id", roomid);
      formData.append("rent_from", rentFrom);
      formData.append("rent_to", rentTo);
      formData.append("rent", true);

      const config = {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      };

      // Save rental details on the backend
      await axios.post(`${backendUrl}/handle-rent/`, formData, config);

      // Redirect to the payment gateway
      const paymentUrl = `https://rc-epay.esewa.com.np/api/epay/main/v2/form?amount=${
        esewaData.total_amount
      }&transaction_uuid=${esewaData.transaction_uuid}&product_code=${
        esewaData.product_code
      }&success_url=${encodeURIComponent(
        esewaData.success_url
      )}&failure_url=${encodeURIComponent(esewaData.failure_url)}`;
      window.location.href = paymentUrl;
    } catch (error) {
      alert("An error occurred while processing your request.");
      console.error(error);
    }
  };

  useEffect(() => {
    if (rentFrom && rentTo) {
      const fromDate = new Date(rentFrom);
      const toDate = new Date(rentTo);
      const differenceInDays = Math.ceil(
        (toDate - fromDate) / (1000 * 60 * 60 * 24)
      );

      setDateDifference(differenceInDays >= 0 ? differenceInDays : 0);
    }
  }, [rentFrom, rentTo]);

  useEffect(() => {
    if (dateDifference > 0 && room) {
      const totalAmount = dateDifference * room.rent;
      setEsewaData((prevData) => ({
        ...prevData,
        total_amount: totalAmount,
        amount: totalAmount,
        success_url: `http://localhost:5173/paymentsuccess/?amount=${totalAmount}&room_seller=${room.user}&transaction_uuid=${esewaData.transaction_uuid}&roomid=${roomid}&rent_from=${rentFrom}&rent_to=${rentTo}`,
      }));
    }
  }, [dateDifference, room]);

  useEffect(() => {
    const { transaction_uuid, product_code, secret, total_amount } = esewaData;
    const signature = generateSignature(
      transaction_uuid,
      product_code,
      secret,
      total_amount
    );
    setEsewaData((prevData) => ({
      ...prevData,
      signature,
    }));
  }, [esewaData.total_amount]);

  const images = room
    ? ["image", "image1", "image2", "image3"].filter((imgKey) => room[imgKey])
    : [];
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleNavigation = (index) => {
    setCurrentSlide(index);
  };

  const handleArrowNavigation = (direction) => {
    const totalSlides = images.length;
    if (direction === "prev") {
      setCurrentSlide((currentSlide - 1 + totalSlides) % totalSlides);
    } else if (direction === "next") {
      setCurrentSlide((currentSlide + 1) % totalSlides);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <span className="loading loading-spinner text-info"></span>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex justify-center items-center h-screen flex-col">
        <h1 className="text-2xl font-bold text-gray-700">Room not found</h1>
        <Link to={'/'}>
          <button className="h-10 px-6 font-semibold rounded-md border mr-2 hover:text-cyan-600 hover:bg-white hover:border-cyan-600 text-white bg-cyan-600">
            Goto Home
          </button>
        </Link>
      </div>
    );
  }

  return (
    <>
      {room ? (
        <div className="bg-white text-black p-6 rounded-lg shadow-lg">
          <div className="slider">
            <div className="w-full h-[80vh] rounded-lg overflow-hidden shadow-md bg-gray-200 relative">
              <div className="carousel w-full h-full relative">
                {images.map((imgKey, index) => (
                  <div
                    key={imgKey}
                    className={`carousel-item w-full h-full flex justify-center items-center ${
                      index === currentSlide ? "block" : "hidden"
                    }`}
                  >
                    <img
                      src={`${backendUrl}/${room[imgKey]}`}
                      alt={`Room ${index + 1}`}
                      className="object-cover w-full h-full"
                    />
                  </div>
                ))}
              </div>

              <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2">
                {images.map((imgKey, index) => (
                  <button
                    key={imgKey}
                    onClick={() => handleNavigation(index)}
                    className={`btn btn-sm ${
                      index === currentSlide
                        ? "bg-gray-800 text-white"
                        : "bg-gray-700 text-gray-300"
                    } hover:bg-gray-900 transition-colors`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>

              <button
                onClick={() => handleArrowNavigation("prev")}
                className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-900"
              >
                &#8592;
              </button>
              <button
                onClick={() => handleArrowNavigation("next")}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-900"
              >
                &#8594;
              </button>
            </div>
          </div>

          <div className="call-message flex items-center justify-between bg-gray-100 rounded-lg shadow-md my-6">
            <div className="call flex-1 flex items-center justify-center gap-2 p-4 hover:bg-gray-200 cursor-pointer">
              <IoCall className="icon text-black text-2xl" />
              <p className="font-semibold text-xl">{room.phoneNumber}</p>
            </div>
            <Link
              to={`/message/${room.user}`}
              className="message flex-1 flex items-center justify-center gap-2 p-4 bg-gray-700 hover:bg-gray-800 text-white rounded-r-lg transition-colors"
            >
              <MdMessage className="icon text-2xl" />
              <span className="font-semibold text-xl">Message Owner</span>
            </Link>
          </div>

          <div className="room-info">
            <h2 className="text-4xl font-extrabold mb-4">Room Details</h2>
            <div className="details grid grid-cols-2 gap-6 bg-gray-50 p-6 rounded-lg shadow-md">
              <div className="total-rooms text-center">
                <h3 className="text-3xl font-bold mb-2">Total Rooms</h3>
                <p className="text-5xl font-black">{room.number_of_rooms}</p>
              </div>
              <div className="address">
                <h3 className="text-3xl font-bold mb-2">Address</h3>
                <p className="text-xl">{room.address}</p>
                <p className="text-xl font-semibold mt-2">
                  Rent: Rs.{room.rent} (per day)
                </p>
                <p className="text-xl mt-2">Bathroom: {room.bathroom}</p>
              </div>
            </div>
          </div>

          <div className="details mt-8 p-6 mb-2 bg-gray-50 rounded-lg shadow-md">
            <h3 className="text-2xl font-semibold mb-4">Additional Details</h3>
            <p className="text-lg">{room.other_details}</p>
          </div>

          <form onSubmit={handleRent}>
            <div className="flex flex-col gap-4">
              <div>
                <label htmlFor="rent-from" className="text-lg font-bold">
                  Rent From:
                </label>
                <input
                  id="rent-from"
                  type="date"
                  value={rentFrom}
                  onChange={(e) => setRentFrom(e.target.value)}
                  className="input w-[50%] ml-3 p-3 rounded-md border border-gray-300 shadow-sm focus:outline-none focus:ring focus:ring-gray-200"
                />
              </div>
              <div>
                <label htmlFor="rent-to" className="font-bold text-lg">
                  Rent To:
                </label>
                <input
                  id="rent-to"
                  type="date"
                  value={rentTo}
                  onChange={(e) => setRentTo(e.target.value)}
                  className="input w-[50%] ml-3 p-3 rounded-md border border-gray-300 shadow-sm focus:outline-none focus:ring focus:ring-gray-200"
                />
              </div>
              <button
                type="submit"
                className="btn bg-gray-700 w-full text-white hidden"
              >
                Rent Now
              </button>
            </div>
          </form>

          <form
            action="https://rc-epay.esewa.com.np/api/epay/main/v2/form"
            method="POST"
          >
            <input
              type="text"
              name="amount"
              className="hidden"
              value={esewaData.amount}
              required
            />
            <input
              type="text"
              name="tax_amount"
              className="hidden"
              value={esewaData.tax_amount}
              required
            />
            <div>
              <label htmlFor="rent-from" className="text-lg font-bold">
                Total Amount: &nbsp; <strong> Rs.</strong>
              </label>
              <input
                type="text"
                name="total_amount"
                readOnly
                value={esewaData.total_amount}
                required
              />
            </div>
            <input
              type="text"
              name="transaction_uuid"
              className="hidden"
              value={esewaData.transaction_uuid}
              required
            />
            <input
              type="text"
              name="product_code"
              className="hidden"
              value={esewaData.product_code}
              required
            />
            <input
              type="text"
              name="product_service_charge"
              className="hidden"
              value={esewaData.product_service_charge}
              required
            />
            <input
              type="text"
              name="product_delivery_charge"
              className="hidden"
              value={esewaData.product_delivery_charge}
              required
            />
            <input
              type="text"
              name="success_url"
              className="hidden"
              value={esewaData.success_url}
              required
            />
            <input
              type="text"
              name="failure_url"
              className="hidden"
              value={esewaData.failure_url}
              required
            />
            <input
              type="text"
              name="signed_field_names"
              className="hidden"
              value={esewaData.signed_field_names}
              required
            />
            <input
              type="text"
              name="signature"
              className="hidden"
              value={esewaData.signature}
              required
            />
            {token ? (
              <input
                type="submit"
                value="Submit"
                className="btn bg-gray-700 w-full text-white"
              />
            ) : (
              <input
                type="submit"
                value="Submit"
                disabled
                className="btn bg-gray-700 w-full text-white"
              />
            )}
          </form>
        </div>
      ) : (
        <div className="flex justify-center items-center">
          <span className="loading loading-spinner text-info"></span>
        </div>
      )}
    </>
  );
};

export default PlaceDetails;