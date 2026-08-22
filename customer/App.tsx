import "text-encoding"
import "react-native-get-random-values"
import React, { useEffect, useState } from "react"
import { View, ActivityIndicator } from "react-native"
import Toast from "react-native-toast-message"
import * as Font from "expo-font"
import * as SplashScreen from "expo-splash-screen"
import { Routes } from "./src/routes"

SplashScreen.preventAutoHideAsync().catch(() => undefined)

export default function App() {
    const [fontsLoaded, setFontsLoaded] = useState(false)

    useEffect(() => {
        const prepare = async () => {
            try {
                await Font.loadAsync({
                    MaterialCommunityIcons: require("react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf"),
                    FontAwesome: require("react-native-vector-icons/Fonts/FontAwesome.ttf"),
                })
            } catch (error) {
                console.log("Font load failed", error)
            } finally {
                setFontsLoaded(true)
                await SplashScreen.hideAsync().catch(() => undefined)
            }
        }
        prepare()
    }, [])

    if (!fontsLoaded) {
        return (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                <ActivityIndicator size="large" />
            </View>
        )
    }

    return (
        <>
            <Routes />
            <Toast position="bottom" />
        </>
    )
}
