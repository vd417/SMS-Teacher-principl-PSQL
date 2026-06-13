import * as ImagePicker from 'expo-image-picker';

// Prefer a data URI so a picked image survives AsyncStorage persistence — on web
// `asset.uri` is a transient `blob:` URL that breaks after reload.
function uriFromResult(result: ImagePicker.ImagePickerResult): string | null {
  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];
  if (asset.base64) {
    const mime = asset.mimeType ?? 'image/jpeg';
    return `data:${mime};base64,${asset.base64}`;
  }
  return asset.uri;
}

export async function pickImageFromLibrary(): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.6,
    base64: true,
  });
  return uriFromResult(result);
}

export async function takePhotoFromCamera(): Promise<string | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return null;
  const result = await ImagePicker.launchCameraAsync({
    quality: 0.6,
    base64: true,
  });
  return uriFromResult(result);
}
