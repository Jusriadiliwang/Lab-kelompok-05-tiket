import React, { useEffect, useRef } from "react";
import { View, Text, Animated, StyleSheet } from "react-native";
import C from "../utils/colors";

export default function SplashScreen() {
  const scale = useRef(new Animated.Value(0.5)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue:1, useNativeDriver:true }),
      Animated.timing(opacity, { toValue:1, duration:600, useNativeDriver:true }),
    ]).start();
  }, []);

  return (
    <View style={s.c}>
      <Animated.View style={[s.logo, { transform:[{scale}], opacity }]}>
        <Text style={s.emoji}>🎫</Text>
      </Animated.View>
      <Animated.Text style={[s.title, { opacity }]}>
        War<Text style={{ color:C.primary }}>Tiket</Text>
      </Animated.Text>
      <Animated.Text style={[s.sub, { opacity }]}>Platform Tiket Konser</Animated.Text>
    </View>
  );
}
const s = StyleSheet.create({
  c:     { flex:1, backgroundColor:C.bg, alignItems:"center", justifyContent:"center" },
  logo:  { width:80, height:80, borderRadius:20, backgroundColor:C.primary, alignItems:"center", justifyContent:"center", marginBottom:16 },
  emoji: { fontSize:40 },
  title: { fontSize:36, fontWeight:"900", color:C.text1, marginBottom:8 },
  sub:   { fontSize:14, color:C.text3 },
});