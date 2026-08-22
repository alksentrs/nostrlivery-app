import React, { useCallback, useEffect, useState } from "react"
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native"
import { Chip, TextInput } from "react-native-paper"
import { useController, useForm } from "react-hook-form"
import Toast from "react-native-toast-message"
import { useFocusEffect } from "@react-navigation/native"
import { ActionButton } from "@odevlibertario/nostrlivery-common"
import { fetchMenuOrCache, publishMenu, splitCategories } from "@util/menu"

type FormValues = {
    name: string
    description: string
    price: string
    imageUrl: string
}

const Field = ({
    name,
    label,
    control,
    rules,
    keyboardType,
    autoCapitalize,
}: {
    name: keyof FormValues
    label: string
    control: any
    rules?: object
    keyboardType?: "default" | "decimal-pad" | "url"
    autoCapitalize?: "none" | "sentences"
}) => {
    const { field, fieldState } = useController({
        name,
        control,
        rules,
        defaultValue: "",
    })
    return (
        <View style={styles.field}>
            <TextInput
                label={label}
                value={field.value}
                onChangeText={field.onChange}
                error={!!fieldState.error}
                keyboardType={keyboardType}
                autoCapitalize={autoCapitalize}
                mode="outlined"
            />
            {fieldState.error?.message ? (
                <Text style={styles.errorText}>{fieldState.error.message}</Text>
            ) : null}
        </View>
    )
}

export const MenuItem = ({ route, navigation }: any) => {
    const editIndex: number | undefined =
        typeof route?.params?.index === "number" ? route.params.index : undefined
    const isUpdate = editIndex !== undefined
    const [categoryInput, setCategoryInput] = useState("")
    const [categories, setCategories] = useState<string[]>([])
    const [categoryError, setCategoryError] = useState("")
    const [isSaving, setIsSaving] = useState(false)

    const form = useForm<FormValues>({
        defaultValues: {
            name: "",
            description: "",
            price: "",
            imageUrl: "",
        },
    })

    useEffect(() => {
        if (!isUpdate) {
            return
        }

        const loadItem = async () => {
            try {
                const menu = await fetchMenuOrCache()
                const item = menu[editIndex]
                if (!item) {
                    Toast.show({ type: "error", text1: "Item not found" })
                    navigation.navigate("Menu")
                    return
                }
                form.setValue("name", item.name)
                form.setValue("description", item.description)
                form.setValue("price", String(item.price ?? ""))
                form.setValue("imageUrl", item.imageUrl ?? "")
                setCategories(splitCategories(item.categories))
            } catch (error) {
                console.log(error)
                Toast.show({ type: "error", text1: "Failed to load item" })
            }
        }

        loadItem()
    }, [editIndex, isUpdate])

    useFocusEffect(
        useCallback(() => {
            if (!isUpdate) {
                form.reset()
                setCategories([])
                setCategoryInput("")
                setCategoryError("")
            }
        }, [isUpdate])
    )

    const addCategories = () => {
        const next = splitCategories(categoryInput)
        if (!next.length) {
            return
        }
        setCategories((current) => {
            const merged = [...current]
            next.forEach((category) => {
                if (!merged.some((existing) => existing.toLowerCase() === category.toLowerCase())) {
                    merged.push(category)
                }
            })
            return merged
        })
        setCategoryInput("")
        setCategoryError("")
    }

    const removeCategory = (category: string) => {
        setCategories((current) => current.filter((item) => item !== category))
    }

    const save = async (values: FormValues) => {
        const allCategories = [...categories]
        splitCategories(categoryInput).forEach((category) => {
            if (!allCategories.some((existing) => existing.toLowerCase() === category.toLowerCase())) {
                allCategories.push(category)
            }
        })
        if (!allCategories.length) {
            setCategoryError("Add at least one category")
            return
        }
        setCategories(allCategories)
        setCategoryInput("")

        setIsSaving(true)
        try {
            const menu = await fetchMenuOrCache()
            const item = {
                name: values.name.trim(),
                description: values.description.trim(),
                price: values.price.trim().replace(",", "."),
                imageUrl: values.imageUrl.trim(),
                categories: allCategories.join(", "),
            }

            const next = isUpdate
                ? menu.map((existing, index) => (index === editIndex ? item : existing))
                : [...menu, item]

            await publishMenu(next)
            form.reset()
            setCategories([])
            Toast.show({
                type: "success",
                text1: isUpdate ? "Item updated" : "Item added",
            })
            navigation.navigate("Menu")
        } catch (error) {
            console.log(error)
            Toast.show({
                type: "error",
                text1: isUpdate ? "Failed to update item" : "Failed to add item",
            })
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
            <ScrollView contentContainerStyle={styles.container}>
                <Field
                    name="name"
                    label="Name"
                    control={form.control}
                    rules={{ required: "Name is required" }}
                />
                <Field
                    name="description"
                    label="Description"
                    control={form.control}
                    rules={{ required: "Description is required" }}
                />
                <Field
                    name="price"
                    label="Price"
                    control={form.control}
                    keyboardType="decimal-pad"
                    rules={{
                        required: "Price is required",
                        pattern: {
                            value: /^\d+([.,]\d{1,2})?$/,
                            message: "Enter a valid price, e.g. 10.50",
                        },
                    }}
                />
                <Field
                    name="imageUrl"
                    label="Image URL"
                    control={form.control}
                    keyboardType="url"
                    autoCapitalize="none"
                    rules={{
                        validate: (value: string) =>
                            !value ||
                            /^https?:\/\/.+/i.test(value) ||
                            "Enter a valid http(s) URL",
                    }}
                />

                <View style={styles.field}>
                    <TextInput
                        label="Categories"
                        value={categoryInput}
                        onChangeText={(text) => {
                            setCategoryInput(text)
                            if (categoryError) {
                                setCategoryError("")
                            }
                        }}
                        onSubmitEditing={addCategories}
                        mode="outlined"
                        placeholder="Type a category and press Add"
                        error={!!categoryError}
                    />
                    {categoryError ? (
                        <Text style={styles.errorText}>{categoryError}</Text>
                    ) : (
                        <Text style={styles.hint}>
                            Add one or more categories. Separate with commas or tap Add.
                        </Text>
                    )}
                    <ActionButton
                        title="Add category"
                        color="purple"
                        onPress={addCategories}
                        customStyle={styles.addCategoryButton}
                    />
                    <View style={styles.chipRow}>
                        {categories.map((category) => (
                            <Chip
                                key={category}
                                onClose={() => removeCategory(category)}
                                style={styles.chip}
                            >
                                {category}
                            </Chip>
                        ))}
                    </View>
                </View>

                <ActionButton
                    title={isUpdate ? "Update" : "Save"}
                    color="purple"
                    isLoading={isSaving}
                    disabled={isSaving}
                    onPress={form.handleSubmit(save, () => {
                        if (!categories.length && !splitCategories(categoryInput).length) {
                            setCategoryError("Add at least one category")
                        }
                        Toast.show({
                            type: "error",
                            text1: "Please fill the required fields",
                        })
                    })}
                    customStyle={styles.button}
                />
                <ActionButton
                    title="Cancel"
                    color="red"
                    disabled={isSaving}
                    onPress={() => {
                        form.reset()
                        navigation.navigate("Menu")
                    }}
                    customStyle={styles.button}
                />
            </ScrollView>
        </KeyboardAvoidingView>
    )
}

const styles = StyleSheet.create({
    flex: {
        flex: 1,
        backgroundColor: "#f5f5f5",
    },
    container: {
        padding: 16,
        paddingBottom: 40,
    },
    field: {
        marginBottom: 12,
    },
    errorText: {
        color: "#d32f2f",
        fontSize: 12,
        marginTop: 4,
        marginLeft: 4,
    },
    hint: {
        color: "#666",
        fontSize: 12,
        marginTop: 4,
        marginLeft: 4,
    },
    addCategoryButton: {
        marginTop: 8,
    },
    chipRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginTop: 8,
    },
    chip: {
        marginRight: 4,
        marginBottom: 4,
    },
    button: {
        marginVertical: 6,
    },
})
