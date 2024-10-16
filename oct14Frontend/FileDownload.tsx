import React, { useState } from 'react';
import { Button, View, Text, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import RNFS from 'react-native-fs';
import axios from 'axios';
import Aes from 'react-native-aes-crypto';
import { Buffer } from 'buffer'; // Import Buffer for encoding conversions

type FileDownloadProps = {
  fileName: string;
  aesKey: string | null; // AES key in Base64 format
};

const FileDownload: React.FC<FileDownloadProps> = ({ fileName, aesKey }) => {
  const [downloadStatus, setDownloadStatus] = useState<string | null>(null);

  const downloadFile = async () => {
    if (!aesKey) {
      Alert.alert('Error', 'AES key is not available. Cannot decrypt the file.');
      return;
    }

    try {
      setDownloadStatus('Downloading file...');
      console.log('Starting file download...');

      // Request the encrypted file from the server
      const response = await axios.get(`http://10.29.155.121:8000/filehandling/download/${fileName}/`, {
        timeout: 10000, // 10 seconds timeout
      });

      if (!response.data.encrypted_data || !response.data.iv) {
        throw new Error('Invalid response from server');
      }

      const encryptedData = response.data.encrypted_data; // Base64 string
      const iv = response.data.iv; // Base64 string

      console.log('Encrypted Data (Base64):', encryptedData);
      console.log('IV (Base64):', iv);

      setDownloadStatus('Decrypting file...');
      console.log('Starting file decryption...');

      // Convert AES key and IV from Base64 to Hex
      const aesKeyHex = Buffer.from(aesKey, 'base64').toString('hex');
      const ivHex = Buffer.from(iv, 'base64').toString('hex');

      console.log('AES Key (Hex):', aesKeyHex);
      console.log('IV (Hex):', ivHex);

      // Decrypt the file using AES-CBC
      const decryptedData = await Aes.decrypt(encryptedData, aesKeyHex, ivHex, 'aes-256-cbc');
      console.log('Decryption completed.');

      // Save the decrypted file to the device's file system
      const path = `${RNFS.DocumentDirectoryPath}/${fileName}`;
      await RNFS.writeFile(path, decryptedData, 'base64'); // 'decryptedData' is Base64-encoded
      console.log(`File saved to ${path}`);

      setDownloadStatus('File downloaded and decrypted successfully!');
      Alert.alert('Success', `File "${fileName}" downloaded and saved.`);
    } catch (error: any) {
      console.error('Error during file download:', error);
      setDownloadStatus('File download failed');
      Alert.alert('Error', `File download failed: ${error.message}`);
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
