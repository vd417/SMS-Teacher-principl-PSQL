import * as ImagePicker from 'expo-image-picker';

function uriFromAsset(asset: ImagePicker.ImagePickerAsset): string {
  if (asset.base64) {
    const mime = asset.mimeType ?? 'image/jpeg';
    return `data:${mime};base64,${asset.base64}`;
  }
  return asset.uri;
}

/** Pick up to `remaining` images from the library (documents / photos). */
export async function pickImagesFromLibrary(remaining: number): Promise<string[]> {
  if (remaining <= 0) return [];
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return [];
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.6,
    base64: true,
    allowsMultipleSelection: remaining > 1,
    selectionLimit: remaining,
  });
  if (result.canceled || !result.assets?.length) return [];
  return result.assets.map(uriFromAsset);
}
