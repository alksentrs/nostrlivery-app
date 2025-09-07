import React from "react"
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TouchableWithoutFeedback,
} from "react-native"

interface Props {
    visible: boolean
    title: string
    message: string
    confirmText?: string
    cancelText?: string
    onConfirm: () => void
    onCancel: () => void
    confirmButtonColor?: string
    cancelButtonColor?: string
}

export const ConfirmationModal = ({
    visible,
    title,
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    onConfirm,
    onCancel,
    confirmButtonColor = "#ff4444",
    cancelButtonColor = "#666666",
}: Props) => {
    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onCancel}
        >
            <TouchableWithoutFeedback onPress={onCancel}>
                <View style={styles.overlay}>
                    <TouchableWithoutFeedback>
                        <View style={styles.modalContainer}>
                            <View style={styles.header}>
                                <Text style={styles.title}>{title}</Text>
                            </View>
                            
                            <View style={styles.content}>
                                <Text style={styles.message}>{message}</Text>
                            </View>
                            
                            <View style={styles.buttonContainer}>
                                <TouchableOpacity
                                    style={[
                                        styles.button,
                                        styles.cancelButton,
                                        { backgroundColor: cancelButtonColor }
                                    ]}
                                    onPress={onCancel}
                                >
                                    <Text style={styles.cancelButtonText}>
                                        {cancelText}
                                    </Text>
                                </TouchableOpacity>
                                
                                <TouchableOpacity
                                    style={[
                                        styles.button,
                                        styles.confirmButton,
                                        { backgroundColor: confirmButtonColor }
                                    ]}
                                    onPress={onConfirm}
                                >
                                    <Text style={styles.confirmButtonText}>
                                        {confirmText}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    )
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 20,
    },
    modalContainer: {
        backgroundColor: "white",
        borderRadius: 12,
        width: "100%",
        maxWidth: 400,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    header: {
        paddingTop: 20,
        paddingHorizontal: 20,
        paddingBottom: 10,
    },
    title: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#333",
        textAlign: "center",
    },
    content: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    message: {
        fontSize: 16,
        color: "#666",
        textAlign: "center",
        lineHeight: 22,
    },
    buttonContainer: {
        flexDirection: "row",
        paddingHorizontal: 20,
        paddingBottom: 20,
        gap: 12,
    },
    button: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: "center",
    },
    cancelButton: {
        backgroundColor: "#666666",
    },
    confirmButton: {
        backgroundColor: "#ff4444",
    },
    cancelButtonText: {
        color: "white",
        fontSize: 16,
        fontWeight: "600",
    },
    confirmButtonText: {
        color: "white",
        fontSize: 16,
        fontWeight: "600",
    },
})
