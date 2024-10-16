// FileUpload.tsx

import React, { useState } from 'react';
import { Button, View, Text, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import DocumentPicker, { DocumentPickerResponse, types } from 'react-native-document-picker';
import axios from 'axios';
import Aes from 'react-native-aes-crypto';
import RNFS from 'react-native-fs';
import { Base64 } from 'js-base64'; // Import Base64 encoding

type FileUploadProps = {
  onUploadSuccess: () => void;
  aesKey: string | null;
};

const FileUpload: React.FC<FileUploadProps> = ({ onUploadSuccess, aesKey }) => {
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  // Function to select a file
  const selectFile = async () => {
    try {
      const result: DocumentPickerResponse[] = await DocumentPicker.pick({
        type: [types.allFiles],
      });

      if (result && result.length > 0) {
        const selectedFile = result[0];
        if (selectedFile.name) {
          setFileName(selectedFile.name);
          uploadFile(selectedFile);
        } else {
          Alert.alert('Error', 'Selected file does not have a name.');
        }
      } else {
        Alert.alert('Error', 'No file selected.');
      }
    } catch (err: any) {
      if (DocumentPicker.isCancel(err)) {
        Alert.alert('Cancelled', 'File selection was canceled.');
      } else {
        Alert.alert('Error', `Unknown error: ${err.message}`);
      }
    }
  };

  // Function to upload the selected file
  const uploadFile = async (file: DocumentPickerResponse) => {
    if (!aesKey) {
      Alert.alert('Error', 'AES key is not available. Cannot encrypt the file.');
      return;
    }

    try {
      setUploadStatus('Encrypting file...');
      setUploadProgress(0);

      // Read the file data as base64
      const fileData = await RNFS.readFile(file.uri, 'base64');
      console.log('File data read as base64:', fileData);
      
      
      // Generate a random IV (Initialization Vector)
      const iv = await Aes.randomKey(16); // 16 bytes for AES
      console.log('Generated IV:', iv);
      console.log('Generated IV length (bytes):', iv.length);

      // Encrypt the file data using AES-CBC
      const encryptedData = await Aes.encrypt(fileData, aesKey, iv, 'aes-256-cbc');
      console.log('Encrypted data:', encryptedData);

      // Encode the IV to base64
      const ivBase64 = Base64.encode(iv); // Ensure the IV is base64 encoded
      console.log('Base64 Encoded IV:', ivBase64);
      console.log('Base64 Encoded IV length:', ivBase64.length);

      setUploadStatus('Uploading encrypted file...');

      // Prepare the form data
      const formData = new FormData();
      formData.append('file_name', file.name); // Send the original file name
      formData.append('encrypted_data', encryptedData); // Encrypted file data
      formData.append('iv', ivBase64); // Base64-encoded IV

      // POST request to the Django backend with upload progress
      const response = await axios.post('http://10.29.155.121:8000/filehandling/upload/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progress = (progressEvent.loaded / progressEvent.total) * 100;
            setUploadStatus(`Uploading... ${Math.round(progress)}%`);
            setUploadProgress(progress);
          }
        },
        timeout: 10000, // 10 seconds timeout
      });

      setUploadStatus('File uploaded successfully!');
      Alert.alert('Success', `File "${response.data.file_name}" uploaded successfully.`);
      onUploadSuccess();
    } catch (error: any) {
      console.error(error);
      setUploadStatus('File upload failed');
      if (error.code === 'ECONNABORTED') {
        Alert.alert('Timeout', 'Upload timed out. Please try again.');
      } else if (error.response && error.response.data && error.response.data.error) {
        Alert.alert('Error', `File upload failed: ${error.response.data.error}`);
      } else {
        Alert.alert('Error', `File upload failed: ${error.message}`);
      }
    }
  };

  return (
    <View style={styles.container}>
      <Button title="Select File" onPress={selectFile} />
      {fileName && <Text style={styles.fileName}>Selected File: {fileName}</Text>}
      {uploadStatus && (
        <View style={styles.statusContainer}>
          <Text style={styles.status}>{uploadStatus}</Text>
          {uploadProgress > 0 && uploadProgress < 100 && (
            <ActivityIndicator size="small" color="#0000ff" style={styles.activityIndicator} />
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  fileName: {
    marginTop: 10,
    fontSize: 16,
    color: '#343a40',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  status: {
    fontSize: 16,
    color: '#6c757d',
  },
  activityIndicator: {
    marginLeft: 10,
  },
});

export default FileUpload;
