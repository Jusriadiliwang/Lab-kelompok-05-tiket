import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import C from "../../utils/colors";

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass,  setShowPass]  = useState(false);
  const [loading,   setLoading]   = useState(false);

  async function handleLogin() {
    if (!username.trim() || !password.trim()) {
      return Alert.alert("Lengkapi Data", "Username dan password wajib diisi.");
    }
    setLoading(true);
    try {
      const res = await api.login(username.trim(), password);
      if (res.ok) {
        login(res.user);
      } else {
        Alert.alert("Login Gagal", res.message || "Username atau password salah.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <LinearGradient colors={["#0a0a0f","#12121a","#0a0a0f"]} style={{ flex:1 }}>
      <KeyboardAvoidingView behavior={Platform.OS==="ios"?"padding":"height"} style={{flex:1}}>
        <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
          {/* Logo */}
          <View style={s.logoWrap}>
            <View style={s.logoBox}><Text style={s.logoEmoji}>🎫</Text></View>
            <Text style={s.title}>War<Text style={{color:C.primary}}>Tiket</Text></Text>
            <Text style={s.sub}>Masuk untuk mulai beli tiket konser</Text>
          </View>

          {/* Card */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Masuk</Text>

            <View style={s.inputWrap}>
              <Ionicons name="person-outline" size={18} color={C.text3} style={s.icon} />
              <TextInput
                style={s.input} placeholder="Username" placeholderTextColor={C.text3}
                value={username} onChangeText={setUsername}
                autoCapitalize="none" autoCorrect={false}
              />
            </View>

            <View style={s.inputWrap}>
              <Ionicons name="lock-closed-outline" size={18} color={C.text3} style={s.icon} />
              <TextInput
                style={s.input} placeholder="Password" placeholderTextColor={C.text3}
                value={password} onChangeText={setPassword}
                secureTextEntry={!showPass}
              />
              <TouchableOpacity onPress={()=>setShowPass(!showPass)}>
                <Ionicons name={showPass?"eye-off-outline":"eye-outline"} size={18} color={C.text3} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={()=>navigation.navigate("ForgotPassword")} style={s.forgotBtn}>
              <Text style={s.forgotText}>Lupa password?</Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.btn} onPress={handleLogin} disabled={loading} activeOpacity={0.85}>
              <LinearGradient colors={[C.primary,"#ff0066"]} style={s.btnGrad} start={{x:0,y:0}} end={{x:1,y:0}}>
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.btnText}>🎫 Masuk</Text>}
              </LinearGradient>
            </TouchableOpacity>

            <View style={s.row}>
              <Text style={s.rowText}>Belum punya akun? </Text>
              <TouchableOpacity onPress={()=>navigation.navigate("Register")}>
                <Text style={[s.rowText,{color:C.primary,fontWeight:"700"}]}>Daftar</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Demo hint */}
          <View style={s.demo}>
            <Text style={s.demoText}>💡 Demo: ketik username & password apa saja</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  container:  { flexGrow:1, padding:24, justifyContent:"center" },
  logoWrap:   { alignItems:"center", marginBottom:32 },
  logoBox:    { width:72,height:72,borderRadius:18,backgroundColor:C.primary,alignItems:"center",justifyContent:"center",marginBottom:12 },
  logoEmoji:  { fontSize:36 },
  title:      { fontSize:32,fontWeight:"900",color:C.text1,marginBottom:4 },
  sub:        { fontSize:13,color:C.text3,textAlign:"center" },
  card:       { backgroundColor:C.card,borderRadius:20,padding:24,borderWidth:1,borderColor:C.border },
  cardTitle:  { fontSize:22,fontWeight:"900",color:C.text1,marginBottom:20 },
  inputWrap:  { flexDirection:"row",alignItems:"center",backgroundColor:C.bg3,borderRadius:12,paddingHorizontal:14,marginBottom:12,borderWidth:1,borderColor:C.border },
  icon:       { marginRight:10 },
  input:      { flex:1,color:C.text1,paddingVertical:13,fontSize:15 },
  forgotBtn:  { alignSelf:"flex-end",marginBottom:20 },
  forgotText: { color:C.primary,fontSize:13,fontWeight:"600" },
  btn:        { borderRadius:12,overflow:"hidden",marginBottom:16 },
  btnGrad:    { paddingVertical:15,alignItems:"center" },
  btnText:    { color:"#fff",fontWeight:"900",fontSize:17 },
  row:        { flexDirection:"row",justifyContent:"center" },
  rowText:    { color:C.text3,fontSize:14 },
  demo:       { marginTop:16,padding:12,backgroundColor:"rgba(255,77,0,0.1)",borderRadius:12,borderWidth:1,borderColor:"rgba(255,77,0,0.2)" },
  demoText:   { color:C.primary,fontSize:12,textAlign:"center" },
});