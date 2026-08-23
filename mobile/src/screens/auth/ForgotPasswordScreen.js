import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import C from "../../utils/colors";

export default function ForgotPasswordScreen({ navigation }) {
  const [step, setStep]   = useState(1); // 1=email, 2=otp, 3=new pass
  const [email, setEmail] = useState("");
  const [otp,   setOtp]   = useState("");
  const [pass,  setPass]  = useState("");
  const [loading, setLoading] = useState(false);

  async function handleNext() {
    setLoading(true);
    await new Promise(r=>setTimeout(r,1200)); // simulate API
    setLoading(false);
    if (step === 1) {
      if (!email.includes("@")) return Alert.alert("Email Tidak Valid");
      Alert.alert("Kode OTP Terkirim",`Kode OTP telah dikirim ke ${email}`);
      setStep(2);
    } else if (step === 2) {
      if (otp.length < 4) return Alert.alert("Kode OTP","Masukkan kode 6 digit.");
      setStep(3);
    } else {
      if (pass.length < 6) return Alert.alert("Password","Minimal 6 karakter.");
      Alert.alert("Berhasil!","Password berhasil diubah. Silakan login.",[
        { text:"Login", onPress:()=>navigation.navigate("Login") }
      ]);
    }
  }

  const steps = [
    { label:"Email", icon:"mail-outline" },
    { label:"Kode OTP", icon:"keypad-outline" },
    { label:"Password Baru", icon:"lock-closed-outline" },
  ];

  return (
    <LinearGradient colors={["#0a0a0f","#12121a"]} style={{flex:1}}>
      <KeyboardAvoidingView behavior={Platform.OS==="ios"?"padding":"height"} style={{flex:1,padding:24}}>
        <TouchableOpacity onPress={()=>navigation.goBack()} style={{marginTop:16,marginBottom:24,width:40}}>
          <Ionicons name="arrow-back" size={24} color={C.text1}/>
        </TouchableOpacity>

        <Text style={s.title}>Lupa Password</Text>
        <Text style={s.sub}>Ikuti langkah berikut untuk reset password kamu</Text>

        {/* Step indicator */}
        <View style={s.stepRow}>
          {steps.map((st,i)=>(
            <React.Fragment key={i}>
              <View style={[s.stepDot, i+1<=step&&{backgroundColor:C.primary}]}>
                <Text style={s.stepNum}>{i+1}</Text>
              </View>
              {i<2&&<View style={[s.stepLine,i+1<step&&{backgroundColor:C.primary}]}/>}
            </React.Fragment>
          ))}
        </View>

        <View style={s.card}>
          <Text style={s.stepLabel}>{steps[step-1].label}</Text>

          {step===1&&(
            <View style={s.inputWrap}>
              <Ionicons name="mail-outline" size={18} color={C.text3} style={s.icon}/>
              <TextInput
                style={s.input} placeholder="Masukkan email kamu"
                placeholderTextColor={C.text3} value={email} onChangeText={setEmail}
                keyboardType="email-address" autoCapitalize="none"
              />
            </View>
          )}
          {step===2&&(
            <View>
              <Text style={s.hint}>Kode OTP dikirim ke {email}</Text>
              <View style={s.inputWrap}>
                <Ionicons name="keypad-outline" size={18} color={C.text3} style={s.icon}/>
                <TextInput
                  style={[s.input,{letterSpacing:8,fontSize:20,fontWeight:"700"}]}
                  placeholder="------" placeholderTextColor={C.text3}
                  value={otp} onChangeText={setOtp}
                  keyboardType="numeric" maxLength={6}
                />
              </View>
              <TouchableOpacity><Text style={{color:C.primary,fontSize:13,marginTop:4}}>Kirim ulang kode</Text></TouchableOpacity>
            </View>
          )}
          {step===3&&(
            <View style={s.inputWrap}>
              <Ionicons name="lock-closed-outline" size={18} color={C.text3} style={s.icon}/>
              <TextInput
                style={s.input} placeholder="Password baru (min. 6 karakter)"
                placeholderTextColor={C.text3} value={pass} onChangeText={setPass}
                secureTextEntry
              />
            </View>
          )}

          <TouchableOpacity style={s.btn} onPress={handleNext} disabled={loading} activeOpacity={0.85}>
            <LinearGradient colors={[C.primary,"#ff0066"]} style={s.btnGrad} start={{x:0,y:0}} end={{x:1,y:0}}>
              {loading
                ? <ActivityIndicator color="#fff"/>
                : <Text style={s.btnText}>{step<3?"Lanjut →":"Reset Password"}</Text>}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  title:     { fontSize:28,fontWeight:"900",color:C.text1,marginBottom:6 },
  sub:       { fontSize:13,color:C.text3,marginBottom:24 },
  stepRow:   { flexDirection:"row",alignItems:"center",marginBottom:24 },
  stepDot:   { width:32,height:32,borderRadius:16,backgroundColor:C.bg3,borderWidth:1,borderColor:C.border,alignItems:"center",justifyContent:"center" },
  stepNum:   { color:C.text1,fontWeight:"700",fontSize:13 },
  stepLine:  { flex:1,height:2,backgroundColor:C.border,marginHorizontal:4 },
  card:      { backgroundColor:C.card,borderRadius:20,padding:20,borderWidth:1,borderColor:C.border },
  stepLabel: { fontSize:18,fontWeight:"700",color:C.text1,marginBottom:16 },
  hint:      { color:C.text3,fontSize:12,marginBottom:12 },
  inputWrap: { flexDirection:"row",alignItems:"center",backgroundColor:C.bg3,borderRadius:10,paddingHorizontal:12,borderWidth:1,borderColor:C.border,marginBottom:16 },
  icon:      { marginRight:8 },
  input:     { flex:1,color:C.text1,paddingVertical:13,fontSize:15 },
  btn:       { borderRadius:12,overflow:"hidden" },
  btnGrad:   { paddingVertical:14,alignItems:"center" },
  btnText:   { color:"#fff",fontWeight:"900",fontSize:16 },
});