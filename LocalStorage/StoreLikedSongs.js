import AsyncStorage from "@react-native-async-storage/async-storage";
import { DeviceEventEmitter } from "react-native";

async function GetLikedSongs() {
  try {
    const value = await AsyncStorage.getItem('LikedSongs');
    if (value !== null) {
      return JSON.parse(value)
    } else {
      return {
        songs: {},
        count: 0,
      }
    }
  } catch (e) {
    // error reading value
  }
}

async function SetLikedSongs(title, artist, image, id, url, duration, language) {
  const stored_value = await GetLikedSongs()
  const count = stored_value.count + 1
  const timestamp = Date.now() // Add timestamp for sorting
  const value = {
    ...stored_value,
    count,
  }
  value.songs[id] = { title, artist, image, id, url, duration, language, count, timestamp }
  try {
    const jsonValue = JSON.stringify(value);
    await AsyncStorage.setItem('LikedSongs', jsonValue);
    DeviceEventEmitter.emit('favorites-updated');
  } catch (e) {
  }
}
async function DeleteALikedSong(id) {
  const stored_value = await GetLikedSongs()
  const value = {
    ...stored_value,
  }
  delete value.songs[id]
  try {
    const jsonValue = JSON.stringify(value);
    await AsyncStorage.setItem('LikedSongs', jsonValue);
    DeviceEventEmitter.emit('favorites-updated');
  } catch (e) {
  }
}
export { GetLikedSongs, SetLikedSongs, DeleteALikedSong }
