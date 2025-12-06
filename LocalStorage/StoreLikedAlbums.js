import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Get all liked albums from AsyncStorage
 * @returns {Promise<Object>} Object containing albums and count
 */
async function GetLikedAlbums() {
    try {
        const value = await AsyncStorage.getItem('LikedAlbums');
        if (value !== null) {
            return JSON.parse(value);
        } else {
            return {
                albums: {},
                count: 0,
            };
        }
    } catch (e) {
        console.error('Error reading liked albums:', e);
        return {
            albums: {},
            count: 0,
        };
    }
}

/**
 * Add an album to liked albums
 * @param {string} image - Album cover image URL
 * @param {string} name - Album name
 * @param {string} year - Album release year
 * @param {string} id - Album ID
 */
async function SetLikedAlbum(image, name, year, id) {
    const stored_value = await GetLikedAlbums();
    const count = stored_value.count + 1;
    const value = {
        ...stored_value,
        count,
    };
    value.albums[id] = { image, name, year, id, count };
    try {
        const jsonValue = JSON.stringify(value);
        await AsyncStorage.setItem('LikedAlbums', jsonValue);
    } catch (e) {
        console.error("Error saving liked album:", e);
    }
}

/**
 * Remove an album from liked albums
 * @param {string} id - Album ID to remove
 */
async function DeleteALikedAlbum(id) {
    const stored_value = await GetLikedAlbums();
    const value = {
        ...stored_value,
    };
    delete value.albums[id];
    try {
        const jsonValue = JSON.stringify(value);
        await AsyncStorage.setItem('LikedAlbums', jsonValue);
    } catch (e) {
        console.error("Error deleting liked album:", e);
    }
}

export { GetLikedAlbums, SetLikedAlbum, DeleteALikedAlbum };
