import React, { useState } from 'react';
import { Button, View, Text, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import RNFS from 'react-native-fs';
import axios from 'axios';
import Aes from 'react-native-aes-crypto';
import { Buffer } from 'buffer'; // To handle encoding conversions
import Share from 'react-native-share'; // Import the Share component
import { retrieveAESKey } from './cryptoUtils'; // Import the AES key retrieval function
import { Base64 } from 'js-base64'; // Import Base64 encoding

type FileDownloadProps = {
  fileName: string;
  aesKey: string | null; // AES key in Base64 format
};

const FileDownload: React.FC<FileDownloadProps> = ({ fileName, aesKey }) => {
  const [downloadStatus, setDownloadStatus] = useState<string | null>(null);

  const downloadFile = async () => {
    try {
      // Check if AES key is available
      if (!aesKey) {
        Alert.alert('Error', 'AES key is not available. Cannot decrypt the file.');
        console.error('AES key is null or undefined.');
        return;
      }

      setDownloadStatus('Downloading file...');
      console.log('Starting file download...');

      // Attempt to download the encrypted file and IV from the server
      let response;
      try {
        response = await axios.get(`http://10.29.155.121:8000/filehandling/download/${fileName}/`, {
          timeout: 10000, // 10 seconds timeout
        });
        console.log('File download response received.');
      } catch (downloadError: any) {
        console.error('Error during HTTP GET request:', downloadError);
        throw new Error(`Failed to download file: ${downloadError.message}`);
      }

      // Validate the server response
      if (!response.data.encrypted_data || !response.data.iv) {
        console.error('Server response is missing encrypted_data or iv.');
        throw new Error('Invalid response from server. Missing encrypted data or IV.');
      }

      const encryptedData = response.data.encrypted_data; // Base64-encoded encrypted data
      const iv = response.data.iv; // Base64-encoded IV
      console.log('AES Key (Base64):', aesKey);
      console.log('Encrypted Data (Base64):', encryptedData);
      console.log('IV (Base64):', iv);

      setDownloadStatus('Decrypting file...');
      console.log('Starting decryption process...');

      // Decode IV from Base64 to Hex
      let ivHex;
      try {
        ivHex = Buffer.from(iv, 'base64').toString('hex');
        console.log('IV (Hex):', ivHex);
      } catch (ivError: any) {
        console.error('Error decoding IV from Base64:', ivError);
        throw new Error(`Failed to decode IV: ${ivError.message}`);
      }

      // Decrypt the file using AES-CBC
      let decryptedData;
      try {
        console.log('encryptedData :', encryptedData);
        console.log('encryptedData length:', (encryptedData.length));
        decryptedData = await Aes.decrypt(encryptedData, aesKey, ivHex, 'aes-256-cbc');
        console.log('File decrypted successfully.');
        console.log('Decrypted Data:', decryptedData);
      } catch (decryptError: any) {
        console.error('Decryption error:', decryptError);
        throw new Error(`Decryption failed: ${decryptError.message}`);
      }

      // Convert decrypted binary string to Base64
      let decryptedDataBase64;
      try {
        decryptedDataBase64 = Buffer.from(decryptedData, 'latin1').toString('base64');
        console.log('Decrypted Data converted to Base64.');
      } catch (conversionError: any) {
        console.error('Error converting decrypted data to Base64:', conversionError);
        throw new Error(`Failed to convert decrypted data: ${conversionError.message}`);
      }

      // Save the decrypted file to the device's file system as Base64
      const filePath = `${RNFS.DocumentDirectoryPath}/${fileName}`;
      try {
        await RNFS.writeFile(filePath, decryptedDataBase64, 'base64'); // Save as Base64
        console.log(`File saved successfully at ${filePath}`);
      } catch (writeError: any) {
        console.error('Error writing decrypted file to disk:', writeError);
        throw new Error(`Failed to save the decrypted file: ${writeError.message}`);
      }

      setDownloadStatus('File downloaded and decrypted successfully!');
      Alert.alert('Success', `File "${fileName}" downloaded and saved.`);

      // Trigger the share functionality to save to the Files app
      try {
        await shareFile(filePath);
        console.log('Share function executed successfully.');
      } catch (shareError: any) {
        console.error('Error during file sharing:', shareError);
        Alert.alert('Error', `File downloaded but failed to share: ${shareError.message}`);
      }
    } catch (error: any) {
      // General catch for any errors not previously caught
      console.error('General error during file download and decryption:', error);
      setDownloadStatus('File download failed');
      Alert.alert('Error', `File download failed: ${error.message}`);
    }
  };

  // Function to trigger the share functionality
  const shareFile = async (filePath: string) => {
    try {
      await Share.open({
        url: `file://${filePath}`, // Share the file from local storage
        type: 'application/octet-stream', // Set the appropriate MIME type (adjust based on your file type)
      });
      console.log('File shared successfully.');
    } catch (error: any) {
      console.error('Error sharing the file:', error);
      Alert.alert('Error', 'Failed to share the file.');
      throw error; // Rethrow to allow higher-level catch to handle it
    }
  };

  return (
    <View>
      <Button title={`Download ${fileName}`} onPress={downloadFile} />
      {downloadStatus && (
        <View style={styles.statusContainer}>
          <Text style={styles.status}>{downloadStatus}</Text>
          {(downloadStatus.includes('Downloading') || downloadStatus.includes('Decrypting')) && (
            <ActivityIndicator size="small" color="#0000ff" />
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  statusContainer: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  status: {
    fontSize: 16,
    color: '#6c757d',
  },
});

export default FileDownload;
