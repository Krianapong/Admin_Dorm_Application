import React, { useState, useEffect } from "react";
import { firestore, storageRef } from "./firebase";

const Books = () => {
  const [zones, setZones] = useState([]);
  const [selectedZone, setSelectedZone] = useState("");
  const [rooms, setRooms] = useState([]);
  const [selectedRoomNumber, setSelectedRoomNumber] = useState("");
  const [roomDetailsData, setRoomDetailsData] = useState(null);
  const [formData, setFormData] = useState({
    roomNumber: "",
    isVacant: true,
    price: "",
    details: "",
    image: null,
  });
  const [newZoneName, setNewZoneName] = useState("");

  useEffect(() => {
    const unsubscribeZones = firestore
      .collection("zones")
      .onSnapshot((snapshot) => {
        const zonesData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setZones(zonesData);
      });

    if (selectedZone) {
      const unsubscribeRooms = firestore
        .collection("zones")
        .doc(selectedZone)
        .collection("rooms")
        .onSnapshot((snapshot) => {
          const roomNumbersData = snapshot.docs.map(
            (doc) => doc.data().roomNumber
          );
          setRooms(roomNumbersData);
        });

      return () => unsubscribeRooms();
    }

    return () => unsubscribeZones();
  }, [selectedZone]);

  useEffect(() => {
    if (selectedZone && selectedRoomNumber) {
      const unsubscribeRoomDetails = firestore
        .collection("zones")
        .doc(selectedZone)
        .collection("rooms")
        .where("roomNumber", "==", selectedRoomNumber)
        .onSnapshot((snapshot) => {
          const roomDetailsData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setRoomDetailsData(roomDetailsData[0]);
        });

      return () => unsubscribeRoomDetails();
    }
  }, [selectedZone, selectedRoomNumber]);

  const handleZoneChange = (e) => {
    setSelectedZone(e.target.value);
    setSelectedRoomNumber(""); // Reset selectedRoomNumber when changing the zone
    setRoomDetailsData(null); // Reset roomDetailsData when changing the zone
  };

  const handleRoomNumberChange = (e) => {
    setSelectedRoomNumber(e.target.value);
  };

  const handleRoomSubmit = async (e) => {
    e.preventDefault();

    try {
      let imageUrl = null;

      // Check if an image is selected
      if (formData.image) {
        // Create a reference to the image in storage
        const imageRef = storageRef.ref(`images/${formData.image.name}`);

        // Upload the image to storage
        await imageRef.put(formData.image);

        // Get the download URL of the uploaded image
        imageUrl = await imageRef.getDownloadURL();
      }

      // Add or update room data in Firestore
      if (roomDetailsData) {
        // If roomDetailsData exists, update the room
        await firestore
          .collection("zones")
          .doc(selectedZone)
          .collection("rooms")
          .doc(roomDetailsData.id)
          .update({
            ...formData,
            image: imageUrl || roomDetailsData.image, // Keep the existing image if no new image is uploaded
          });
      } else {
        // If roomDetailsData doesn't exist, add a new room
        await firestore
          .collection("zones")
          .doc(selectedZone)
          .collection("rooms")
          .add({
            ...formData,
            image: imageUrl,
          });
      }

      setFormData({
        roomNumber: "",
        isVacant: true,
        price: "",
        details: "",
        image: null,
      });

      alert("Room submitted successfully!");
    } catch (error) {
      console.error("Error submitting room:", error.message);
      alert(`Failed to submit room. Error: ${error.message}`);
    }
  };

  const handleImageChange = (e) => {
    const imageFile = e.target.files[0];
    setFormData({
      ...formData,
      image: imageFile,
    });
  };

  const handleAddZone = async () => {
    try {
      await firestore.collection("zones").add({
        name: newZoneName,
      });

      setNewZoneName("");
      alert("Zone added successfully!");
    } catch (error) {
      console.error("Error adding zone:", error.message);
      alert(`Failed to add zone. Error: ${error.message}`);
    }
  };

  const handleRoomAction = (action) => async () => {
    try {
      if (roomDetailsData) {
        if (action === "update") {
          // If roomDetailsData exists, update the room
          await firestore
            .collection("zones")
            .doc(selectedZone)
            .collection("rooms")
            .doc(roomDetailsData.id)
            .update({
              ...formData,
              image: imageUrl || roomDetailsData.image, // Keep the existing image if no new image is uploaded
            });
        } else if (action === "delete") {
          // If roomDetailsData exists, delete the room
          await firestore
            .collection("zones")
            .doc(selectedZone)
            .collection("rooms")
            .doc(roomDetailsData.id)
            .delete();

          setRoomDetailsData(null);
        }
      }
    } catch (error) {
      console.error(`Error ${action}ing room:`, error.message);
      alert(`Failed to ${action} room. Error: ${error.message}`);
    }
  };

  return (
    <div>
      <h2>Manage Rooms</h2>

      <label>
        Add New Zone:
        <input
          type="text"
          value={newZoneName}
          onChange={(e) => setNewZoneName(e.target.value)}
        />
        <button onClick={handleAddZone}>Add Zone</button>
      </label>

      <label>
        Select Zone:
        <select onChange={handleZoneChange} value={selectedZone}>
          <option value="">Select a Zone</option>
          {zones.map((zone) => (
            <option key={zone.id} value={zone.id}>
              {zone.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        Select Room Number:
        <select onChange={handleRoomNumberChange} value={selectedRoomNumber}>
          <option value="">Select a Room Number</option>
          {rooms.map((roomNumber) => (
            <option key={roomNumber} value={roomNumber}>
              {roomNumber}
            </option>
          ))}
        </select>
      </label>

      {selectedZone && (
        <div>
          {roomDetailsData && (
            <div>
              <p>Room Number: {roomDetailsData.roomNumber}</p>
              <p>Is Vacant: {roomDetailsData.isVacant ? "Yes" : "No"}</p>
              <p>Price: {roomDetailsData.price}</p>
              <p>Details: {roomDetailsData.details}</p>
              <p>Image URL: {roomDetailsData.image}</p>

              <label>
                Room Number:
                <input
                  type="text"
                  value={formData.roomNumber}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      roomNumber: e.target.value,
                    })
                  }
                />
              </label>
              <br />

              <label>
                Is Vacant:
                <input
                  type="checkbox"
                  checked={formData.isVacant}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      isVacant: e.target.checked,
                    })
                  }
                />
              </label>
              <br />

              <label>
                Price:
                <input
                  type="text"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      price: e.target.value,
                    })
                  }
                />
              </label>
              <br />

              <label>
                Details:
                <textarea
                  value={formData.details}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      details: e.target.value,
                    })
                  }
                />
              </label>
              <br />

              <label>
                Image URL:
                <input
                  type="file"
                  onChange={handleImageChange}
                />
              </label>
              <br />

              <button onClick={handleRoomAction("update")}>Update Room</button>
              <button onClick={handleRoomAction("delete")}>Delete Room</button>
            </div>
          )}

          <form onSubmit={handleRoomSubmit}>
            <label>
              Room Number:
              <input
                type="text"
                value={formData.roomNumber}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    roomNumber: e.target.value,
                  })
                }
              />
            </label>
            <br />

            <label>
              Is Vacant:
              <input
                type="checkbox"
                checked={formData.isVacant}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    isVacant: e.target.checked,
                  })
                }
              />
            </label>
            <br />

            <label>
              Price:
              <input
                type="text"
                value={formData.price}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    price: e.target.value,
                  })
                }
              />
            </label>
            <br />

            <label>
              Details:
              <textarea
                value={formData.details}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    details: e.target.value,
                  })
                }
              />
            </label>
            <br />

            <label>
              Image URL:
              <input
                type="file"
                onChange={handleImageChange}
              />
            </label>
            <br />

            <button type="submit">Add/Update Room</button>
          </form>
        </div>
      )}
    </div>
  );
};

export default Books;
