// FileList.tsx
import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { View, Text, Button, FlatList, Alert, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import axios, { AxiosResponse } from 'axios';

// Define the prop types for FileList
type FileListProps = {
  onFileSelect: (fileName: string) => void;
};

// Define the methods that can be called via ref
export type FileListHandle = {
  fetchFiles: () => void;
};

// Use forwardRef to pass the ref from parent to child
const FileList = forwardRef<FileListHandle, FileListProps>(({ onFileSelect }, ref) => {
  const [files, setFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);

  // Expose fetchFiles method to parent via ref
  useImperativeHandle(ref, () => ({
    fetchFiles,
  }));

  // Fetch the list of files from the backend
  const fetchFiles = async () => {
    try {
      setLoading(true);
      const response: AxiosResponse<{ files: string[] }> = await axios.get('http://10.29.155.121:8000/filehandling/list_files/', {
        timeout: 10000, // 10 seconds timeout
      });
      console.log('Response data:', response.data); // Debug: log the response data
      setFiles(response.data.files); // Set the file list in state
      setError(false);
    } catch (err: any) {
      console.error(err);
      setError(true);
      Alert.alert('Error', 'Failed to fetch file list.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch the files when the component mounts
  useEffect(() => {
    fetchFiles();
  }, []);

  // Render each file in the list
  const renderFileItem = ({ item }: { item: string }) => (
    <TouchableOpacity style={styles.fileItem} onPress={() => onFileSelect(item)}>
      <Text style={styles.fileText}>{item}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Button title="Refresh File List" onPress={fetchFiles} />
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#0000ff" />
          <Text style={styles.status}>Loading files...</Text>
        </View>
      ) : error ? (
        <Text style={styles.status}>Failed to fetch files</Text>
      ) : (
        <FlatList
          data={files}
          renderItem={renderFileItem}
          keyExtractor={(item, index) => `${item}-${index}`} // Ensuring unique keys
          ListEmptyComponent={() => <Text style={styles.status}>No files available</Text>}
          contentContainerStyle={files.length === 0 && styles.emptyListContainer}
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1, // Allow the container to take up available space
    marginBottom: 20,
  },
  fileItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderColor: '#ccc',
  },
  fileText: {
    fontSize: 16,
    color: '#343a40',
  },
  status: {
    marginTop: 10,
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  emptyListContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
});

export default FileList;
