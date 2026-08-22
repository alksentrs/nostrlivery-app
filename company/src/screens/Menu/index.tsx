import React, { useCallback, useState } from "react"
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native"
import { List } from "react-native-paper"
import { useFocusEffect } from "@react-navigation/native"
import {
    ActionButton,
    MenuItem as MenuItemModel,
    StorageService,
    StoredKey,
} from "@odevlibertario/nostrlivery-common"
import { fetchMenuOrCache, publishMenu, splitCategories } from "@util/menu"

export const MenuScreen = ({ navigation }: any) => {
    const storageService = new StorageService()
    const [menu, setMenu] = useState<MenuItemModel[]>([])

    const loadMenu = useCallback(async () => {
        try {
            const items = await fetchMenuOrCache()
            setMenu(items)
            await storageService.set(StoredKey.MENU, items)
        } catch (error) {
            console.log(error)
        }
    }, [])

    useFocusEffect(
        useCallback(() => {
            loadMenu()
        }, [loadMenu])
    )

    const removeAlert = (name: string, index: number) => {
        Alert.alert("Remove Item", `Are you sure you want to remove the item ${name}?`, [
            { text: "Cancel", style: "cancel" },
            { text: "OK", onPress: () => remove(index) },
        ])
    }

    const remove = async (index: number) => {
        try {
            const next = menu.filter((_, itemIndex) => itemIndex !== index)
            const published = await publishMenu(next)
            setMenu(published)
        } catch (error) {
            console.log(error)
            Alert.alert("Error", "Failed to remove item")
        }
    }

    const grouped = menu.reduce<Record<string, MenuItemModel[]>>((groups, item) => {
        const categories = splitCategories(item.categories)
        const keys = categories.length ? categories : ["Uncategorized"]
        keys.forEach((category) => {
            groups[category] = groups[category] || []
            groups[category].push(item)
        })
        return groups
    }, {})

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.listContent}>
                {menu.length === 0 ? (
                    <Text style={styles.empty}>No menu items yet. Add one below.</Text>
                ) : (
                    <List.Section>
                        {Object.keys(grouped).map((category) => (
                            <View key={category}>
                                <List.Subheader>{category}</List.Subheader>
                                {grouped[category].map((item) => (
                                    <List.Item
                                        key={`${category}-${item.index}-${item.name}`}
                                        title={`${item.name} - ${item.price}`}
                                        description={item.description}
                                        left={() =>
                                            item.imageUrl ? (
                                                <Image
                                                    style={styles.thumb}
                                                    source={{ uri: item.imageUrl }}
                                                />
                                            ) : (
                                                <List.Icon icon="food" />
                                            )
                                        }
                                        right={() => (
                                            <>
                                                <TouchableOpacity
                                                    style={styles.iconButton}
                                                    onPress={() =>
                                                        navigation.navigate("Menu Item", {
                                                            index: item.index,
                                                        })
                                                    }
                                                >
                                                    <List.Icon icon="pencil" />
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    onPress={() =>
                                                        removeAlert(item.name, item.index ?? -1)
                                                    }
                                                >
                                                    <List.Icon icon="delete" />
                                                </TouchableOpacity>
                                            </>
                                        )}
                                    />
                                ))}
                            </View>
                        ))}
                    </List.Section>
                )}
            </ScrollView>
            <ActionButton
                title="Add Item"
                color="purple"
                onPress={() => navigation.navigate("Menu Item", { index: undefined })}
            />
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        margin: "2%",
    },
    listContent: {
        paddingBottom: 16,
    },
    empty: {
        textAlign: "center",
        color: "#666",
        marginTop: 40,
        marginBottom: 20,
    },
    thumb: {
        width: 60,
        height: 60,
        borderRadius: 6,
    },
    iconButton: {
        marginRight: "2%",
    },
})
