// App.tsx


import React, { useState, useEffect, useRef } from 'react';
import { Button,View, Text, StyleSheet, Alert } from 'react-native';
import FileUpload from './FileUpload';
import FileList, { FileListHandle } from './FileList';
import FileDownload from './FileDownload';
import ErrorBoundary from './ErrorBoundary'; // Ensure this path is correct


// App.tsx or relevant component


import { deleteAESKeySecurely } from './cryptoUtils';




// Import functions from cryptoUtils.ts
import {
 fetchPublicKey,
 generateAESKey,
 encryptAESKey,
 sendEncryptedAESKey,
 saveAESKeySecurely,
 retrieveAESKey,
} from './cryptoUtils.ts'; // Adjust the path if necessary


const App = () => {
 // const handleDeleteAESKey = async () => {
 //   const success = await deleteAESKeySecurely();
 //   if (success) {
 //     // Optionally, navigate the user to the key exchange flow again
 //     // For example:
 //     // navigateToKeyExchange();
 //   }
 // };


 // return (
 //   <View>
 //     {/* Other components and UI elements */}
 //     <Button title="Reset AES Key" onPress={handleDeleteAESKey} />
 //   </View>
 // );
 const [aesKey, setAesKey] = useState<string | null>(null);
 const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
 const fileListRef = useRef<FileListHandle>(null); // Reference to FileList for triggering refresh


 // Perform the key exchange when the app mounts
 useEffect(() => {
   const performKeyExchange = async () => {
     try {
       // Step 1: Check if AES key exists in secure storage
       const storedAESKey = await retrieveAESKey();
       if (storedAESKey) {
         setAesKey(storedAESKey);
         console.log('AES key loaded from secure storage.');
         Alert.alert('Info', 'AES key loaded from secure storage.');
         return;
       }


       // Step 2: Fetch the server's public key
       const publicKey = await fetchPublicKey();
       if (!publicKey) {
         throw new Error('Public key retrieval failed.');
       }


       // Step 3: Generate the AES key
       const generatedAESKey = await generateAESKey();
       if (!generatedAESKey) {
         throw new Error('AES key generation failed.');
       }


       // Step 4: Encrypt the AES key with the server's public key
       const encryptedAESKey = await encryptAESKey(generatedAESKey);
       if (!encryptedAESKey) {
         throw new Error('AES key encryption failed.');
       }


       // Step 5: Send the encrypted AES key to the server
       const sendSuccess = await sendEncryptedAESKey(encryptedAESKey);
       if (!sendSuccess) {
         throw new Error('Sending encrypted AES key failed.');
       }


       // Step 6: Save the AES key securely
       const saveSuccess = await saveAESKeySecurely(generatedAESKey);
       if (!saveSuccess) {
         throw new Error('Saving AES key securely failed.');
       }


       setAesKey(generatedAESKey);


       Alert.alert('Success', 'Secure key exchange completed successfully.');
     } catch (error: any) {
       console.error('Key exchange error:', error);
       Alert.alert('Error', `Key exchange failed: ${error.message}`);
     }
   };


   performKeyExchange();
 }, []);


 // Callback when a file is uploaded successfully
 const onUploadSuccess = () => {
   if (fileListRef.current) {
     fileListRef.current.fetchFiles(); // Refresh the file list
   }
 };


 return (
   <ErrorBoundary>
     <View style={styles.container}>
       <Text style={styles.title}>File Upload & Download</Text>


       {/* File Upload Section */}
       <FileUpload onUploadSuccess={onUploadSuccess} aesKey={aesKey} />


       {/* File List Section */}
       <View style={styles.listContainer}>
         <FileList ref={fileListRef} onFileSelect={(fileName) => setSelectedFileName(fileName)} />
       </View>


       {/* File Download Section */}
       {selectedFileName && <FileDownload fileName={selectedFileName} aesKey={aesKey} />}
     </View>
   </ErrorBoundary>
 );
};


const styles = StyleSheet.create({
 container: {
   flex: 1, // Allow the container to take up the full screen
   padding: 20,
   backgroundColor: '#f5f5f5',
 },
 title: {
   fontSize: 22,
   fontWeight: 'bold',
   marginBottom: 20,
   textAlign: 'center',
 },
 listContainer: {
   flex: 1, // Allow the FileList to expand and be scrollable
   marginBottom: 20, // Space between the list and download section
 },
});


export default App;



