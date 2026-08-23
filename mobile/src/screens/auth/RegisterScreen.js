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

export default function RegisterScreen({ navigation }) {
  const { login } = useAuth();
  const [form, setForm] = useState({ username:"", email:"", password:"", confirm:"" });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  async function handleRegister() {
    if (!form.username||!form.email||!form.password)
      return Alert.alert("Lengkapi Data","Semua field wajib diisi.");
    if (form.password !== form.confirm)
      return Alert.alert("Password Tidak Cocok","Konfirmasi password tidak sesuai.");
    if (form.password.length < 6)
      return Alert.alert("Password Terlalu Pendek","Minimal 6 karakter.");

    setLoading(true);
    try {
      const res = await api.register(form.username.trim(), form.email.trim(), form.password);
      if (res.ok) {
        Alert.alert("Registrasi Berhasil!","Selamat datang di WarTiket 🎫",[
          { text:"Mulai", onPress:()=>login(res.user) }
        ]);
      }
    } finally { setLoading(false); }
  }

  return (
    <LinearGradient colors={["#0a0a0f","#12121a"]} style={{flex:1}}>
      <KeyboardAvoidingView behavior={Platform.OS==="ios"?"padding":"height"} style={{flex:1}}>
        <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={()=>navigation.goBack()} style={s.back}>
            <Ionicons name="arrow-back" size={24} color={C.text1}/>
          </TouchableOpacity>

          <View style={s.header}>
            <View style={s.logoBox}><Text style={{fontSize:32}}>🎫</Text></View>
            <Text style={s.title}>Buat Akun</Text>
            <Text style={s.sub}>Daftar dan mulai war tiket konser favoritmu</Text>
          </View>

          <View style={s.card}>
            {[
              {key:"username",label:"Username",icon:"person-outline",ph:"pilih username unik",cap:"none"},
              {key:"email",label:"Email",icon:"mail-outline",ph:"email@contoh.com",cap:"none",kb:"email-address"},
              {key:"password",label:"Password",icon:"lock-closed-outline",ph:"min. 6 karakter",secure:true},
              {key:"confirm",label:"Konfirmasi Password",icon:"lock-open-outline",ph:"ulangi password",secure:true},
            ].map(f=>(
              <View key={f.key} style={s.group}>
                <Text style={s.label}>{f.label}</Text>
                <View style={s.inputWrap}>
                  <Ionicons name={f.icon} size={16} color={C.text3} style={s.icon}/>
                  <TextInput
                    style={s.input}
                    placeholder={f.ph} placeholderTextColor={C.text3}
                    value={form[f.key]} onChangeText={v=>set(f.key,v)}
                    autoCapitalize={f.cap||"sentences"}
                    keyboardType={f.kb||"default"}
                    secureTextEntry={f.secure&&!showPass}
                  />
                  {f.secure&&(
                    <TouchableOpacity onPress={()=>setShowPass(!showPass)}>
                      <Ionicons name={showPass?"eye-off-outline":"eye-outline"} size={16} color={C.text3}/>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}

            <TouchableOpacity style={s.btn} onPress={handleRegister} disabled={loading} activeOpacity={0.85}>
              <LinearGradient colors={[C.primary,"#ff0066"]} style={s.btnGrad} start={{x:0,y:0}} end={{x:1,y:0}}>
                {loading
                  ? <ActivityIndicator color="#fff"/>
                  : <Text style={s.btnText}>Daftar Sekarang</Text>}
              </LinearGradient>
            </TouchableOpacity>

            <View style={s.row}>
              <Text style={s.rowText}>Sudah punya akun? </Text>
              <TouchableOpacity onPress={()=>navigation.navigate("Login")}>
                <Text style={[s.rowText,{color:C.primary,fontWeight:"700"}]}>Masuk</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  container: { flexGrow:1,padding:24 },
  back:      { marginTop:16,marginBottom:8,width:40 },
  header:    { alignItems:"center",marginBottom:24 },
  logoBox:   { width:64,height:64,borderRadius:16,backgroundColor:C.primary,alignItems:"center",justifyContent:"center",marginBottom:10 },
  title:     { fontSize:28,fontWeight:"900",color:C.text1,marginBottom:4 },
  sub:       { fontSize:13,color:C.text3,textAlign:"center" },
  card:      { backgroundColor:C.card,borderRadius:20,padding:20,borderWidth:1,borderColor:C.border },
  group:     { marginBottom:14 },
  label:     { fontSize:13,fontWeight:"600",color:C.text2,marginBottom:6 },
  inputWrap: { flexDirection:"row",alignItems:"center",backgroundColor:C.bg3,borderRadius:10,paddingHorizontal:12,borderWidth:1,borderColor:C.border },
  icon:      { marginRight:8 },
  input:     { flex:1,color:C.text1,paddingVertical:12,fontSize:14 },
  btn:       { borderRadius:12,overflow:"hidden",marginTop:8,marginBottom:16 },
  btnGrad:   { paddingVertical:14,alignItems:"center" },
  btnText:   { color:"#fff",fontWeight:"900",fontSize:16 },
  row:       { flexDirection:"row",justifyContent:"center" },
  rowText:   { color:C.text3,fontSize:14 },
});