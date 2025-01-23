import React from "react";
import { Modal, View, Text, StyleSheet, TouchableOpacity } from "react-native";

interface ConfirmationModalProps {
    visible: boolean;                  // Controls the visibility of the modal
    message: string;                   // Custom message to display in the modal
    onConfirm: () => void;             // Callback for the confirm button
    onCancel: () => void;              // Callback for the cancel button
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    visible,
    message,
    onConfirm,
    onCancel,
}) => {
    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={onCancel} // Handle back button press on Android
        >
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    <Text style={styles.message}>{message}</Text>
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={[styles.button, styles.cancelButton]}
                            onPress={onCancel}
                        >
                            <Text style={styles.buttonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.button, styles.confirmButton]}
                            onPress={onConfirm}
                        >
                            <Text style={[styles.buttonText, { color: "white" }]}>Confirm</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    modalContainer: {
        backgroundColor: "white",
        padding: 20,
        borderRadius: 10,
        alignItems: "center",
    },
    message: {
        fontSize: 16,
        marginBottom: 20,
        textAlign: "center",
    },
    buttonContainer: {
        flexDirection: "row",
        gap: 10, // Adds space between the buttons
    },
    button: {
        flex: 1,
        padding: 12,
        borderRadius: 5,
        alignItems: "center",
    },
    cancelButton: {
        backgroundColor: "#ccc",
    },
    confirmButton: {
        backgroundColor: "purple",
    },
    buttonText: {
        fontWeight: "bold",
    },
});
