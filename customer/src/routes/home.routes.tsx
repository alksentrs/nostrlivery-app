import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons"
import { HomeScreen } from "@screens/Home"
import { OrdersScreen } from "@screens/Orders"
import { ProfileScreen } from "@screens/Profile"
import { CompanyMenuScreen } from "@screens/CompanyMenu"
import { CartScreen } from "@screens/Cart"
import { CheckoutScreen } from "@screens/Checkout"

const { Navigator, Screen } = createBottomTabNavigator()

export function HomeRoutes() {
  return (
    <Navigator
      initialRouteName="Home"
      screenOptions={{
        tabBarStyle: { height: 80, paddingBottom: 20 },
        tabBarActiveTintColor: "#2f1650",
        tabBarInactiveTintColor: "#a8a8a8",
        tabBarLabelStyle: { fontSize: 14 },
      }}
    >
      <Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" color={color} size={size} />
          ),
        }}
      />
      <Screen
        name="Orders"
        component={OrdersScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cart" color={color} size={size} />
          ),
        }}
      />
      <Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account" color={color} size={size} />
          ),
        }}
      />
      <Screen
        name="CompanyMenu"
        component={CompanyMenuScreen}
        options={{ tabBarButton: () => null }}
      />
      <Screen
        name="Cart"
        component={CartScreen}
        options={{ tabBarButton: () => null }}
      />
      <Screen
        name="Checkout"
        component={CheckoutScreen}
        options={{ tabBarButton: () => null }}
      />
    </Navigator>
  )
}
