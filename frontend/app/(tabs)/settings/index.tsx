import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, Platform, ScrollView, Switch } from "react-native";
import { useSecurity } from "../../../src/state/security";
import { useRouter } from "expo-router";
import { openFactoryResetSettings } from "../../../src/utils/android";
import { useTheme } from "../../../src/state/theme";
import { accents, AccentKey } from "../../../src/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { autoWipe, AutoWipeStatus } from "../../../src/utils/autoWipe";
import { activeAuthWipe, ActiveAuthStatus } from "../../../src/utils/activeAuthWipe";
import { DualKeyNuclearPanel } from "../../../src/components/DualKeyNuclearPanel";

export default function SettingsScreen() {
  const router = useRouter();
  const sec = useSecurity();
  const { colors, setAccent, accentKey, setMode, mode } = useTheme();
  const [chatsPin, setChatsPin] = useState("");
  const [vaultPin, setVaultPin] = useState("");
  const [panicPin, setPanicPin] = useState("");
  const [showChats, setShowChats] = useState(false);
  const [showVault, setShowVault] = useState(false);
  const [showPanic, setShowPanic] = useState(false);
  const [autoLock, setAutoLock] = useState("300000"); // 5 min default

  // Auto-Wipe states
  const [autoWipeEnabled, setAutoWipeEnabled] = useState(false);
  const [autoWipeDays, setAutoWipeDays] = useState("7");
  const [autoWipeType, setAutoWipeType] = useState<'app_data' | 'full_nuke'>('app_data');
  const [autoWipeStatus, setAutoWipeStatus] = useState<AutoWipeStatus | null>(null);
  const [autoWipeLoading, setAutoWipeLoading] = useState(false);

  // Active Authentication states
  const [activeAuthEnabled, setActiveAuthEnabled] = useState(false);
  const [activeAuthHours, setActiveAuthHours] = useState("72");
  const [activeAuthType, setActiveAuthType] = useState<'app_data' | 'full_nuke'>('app_data');
  const [activeAuthStatus, setActiveAuthStatus] = useState<ActiveAuthStatus | null>(null);
  const [activeAuthLoading, setActiveAuthLoading] = useState(false);

  // Dual-Key Nuclear Submarine Protocol states
  const [nuclearPanelVisible, setNuclearPanelVisible] = useState(false);
  const [nuclearProtocolType, setNuclearProtocolType] = useState<'dual_key' | 'split_master_key'>('dual_key');

  useEffect(() => {
    loadAutoWipeStatus();
    loadActiveAuthStatus();
  }, []);

  const loadAutoWipeStatus = async () => {
    try {
      const status = await autoWipe.getConfig();
      if (status) {
        setAutoWipeStatus(status);
        setAutoWipeEnabled(status.enabled);
        setAutoWipeDays(status.days_inactive.toString());
        setAutoWipeType(status.wipe_type as 'app_data' | 'full_nuke');
      }
    } catch (error) {
      console.error('Failed to load auto-wipe status:', error);
    }
  };

  const loadActiveAuthStatus = async () => {
    try {
      const config = await activeAuthWipe.getConfig();
      if (config) {
        setActiveAuthEnabled(config.enabled);
        setActiveAuthHours(config.auth_interval_hours.toString());
        setActiveAuthType(config.wipe_type);
      }
      
      const status = await activeAuthWipe.checkAuthenticationStatus();
      if (status) {
        setActiveAuthStatus(status);
      }
    } catch (error) {
      console.error('Failed to load active auth status:', error);
    }
  };

  const savePins = async () => {
    if (chatsPin) { if (chatsPin.length !== 6) { Alert.alert("Chats PIN", "Use 6 digits"); return; } await sec.setChatsPin(chatsPin); }
    if (vaultPin) { if (vaultPin.length !== 6) { Alert.alert("Vault PIN", "Use 6 digits"); return; } await sec.setVaultPin(vaultPin); }
    if (panicPin) { if (panicPin.length !== 6) { Alert.alert("Panic PIN", "Use 6 digits"); return; } await sec.setPanicPin(panicPin); }
    Alert.alert("Saved", "PINs updated");
    setChatsPin(""); setVaultPin(""); setPanicPin("");
  };

  const onAutoLockSave = () => {
    const v = Math.max(30_000, Math.min(10 * 60_000, parseInt(autoLock || "0", 10)));
    sec.setAutoLockMs(v);
    Alert.alert("Saved", `Auto-lock set to ${Math.round(v/1000)}s`);
  };

  const onAutoWipeSave = async () => {
    try {
      setAutoWipeLoading(true);
      const days = parseInt(autoWipeDays, 10);
      
      if (days < 1 || days > 14) {
        Alert.alert("Invalid Days", "Auto-wipe days must be between 1 and 14");
        return;
      }

      if (autoWipeType === 'full_nuke') {
        Alert.alert(
          "⚠️ DANGER: Full NUKE Confirmation",
          `You are enabling FULL DEVICE NUKE with STEELOS-SHREDDER.\n\nThis will COMPLETELY OBLITERATE all data after ${days} days of inactivity.\n\nAre you absolutely sure?`,
          [
            { text: "Cancel", style: "cancel" },
            { 
              text: "ENABLE NUKE", 
              style: "destructive",
              onPress: async () => {
                await autoWipe.configureAutoWipe(autoWipeEnabled, days, autoWipeType, 2);
                await loadAutoWipeStatus();
              }
            }
          ]
        );
        return;
      }

      await autoWipe.configureAutoWipe(autoWipeEnabled, days, autoWipeType, 2);
      await loadAutoWipeStatus();
    } catch (error) {
      console.error('Auto-wipe configuration failed:', error);
  const onActiveAuthSave = async () => {
    try {
      setActiveAuthLoading(true);
      const hours = parseInt(activeAuthHours, 10);
      
      const validHours = [24, 48, 72, 96, 120, 144, 168];
      if (!validHours.includes(hours)) {
        Alert.alert("Invalid Hours", "Active auth hours must be 24, 48, 72, 96, 120, 144, or 168 hours");
        return;
      }

      if (activeAuthType === 'full_nuke') {
        Alert.alert(
          "⚠️ DANGER: Active Auth Full NUKE",
          `You are enabling ACTIVE AUTHENTICATION with FULL DEVICE NUKE.\n\nIf you don't enter your PIN in OMERTA within ${hours} hours, STEELOS-SHREDDER will COMPLETELY OBLITERATE all data.\n\nThis is a "Dead Man's Switch" - are you absolutely sure?`,
          [
            { text: "Cancel", style: "cancel" },
            { 
              text: "ENABLE DEAD MAN'S SWITCH", 
              style: "destructive",
              onPress: async () => {
                await activeAuthWipe.configureActiveAuth(activeAuthEnabled, hours, activeAuthType, 6);
                await loadActiveAuthStatus();
              }
            }
          ]
        );
        return;
      }

      await activeAuthWipe.configureActiveAuth(activeAuthEnabled, hours, activeAuthType, 6);
      await loadActiveAuthStatus();
    } catch (error) {
      console.error('Active auth configuration failed:', error);
    } finally {
      setActiveAuthLoading(false);
    }
  };

  const triggerPanic = async () => {
    if (panicPin.length !== 6) { Alert.alert("Enter Panic PIN", "Provide the 6-digit panic PIN to simulate duress."); return; }
    const ok = await sec.isPanicPin(panicPin);
    if (ok) {
      await sec.secureSelfWipe();
      router.replace('/decoy');
      if (Platform.OS === 'android') {
        await openFactoryResetSettings();
      }
    } else {
      Alert.alert("Wrong", "Panic PIN did not match.");
    }
  };

  const AccentSwatches = () => (
    <View style={{ flexDirection: 'row', marginTop: 8 }}>
      {Object.keys(accents).map((k) => {
        const key = k as AccentKey;
        const c = accents[key];
        const sel = key === accentKey;
        return (
          <TouchableOpacity key={key} onPress={() => setAccent(key)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c, marginRight: 10, borderWidth: sel ? 3 : 1, borderColor: sel ? '#fff' : '#1f2937' }} />
        );
      })}
    </View>
  );

  const ModeRow = () => (
    <View style={{ flexDirection: 'row', marginTop: 8 }}>
      {(["dark","light","system"] as const).map((m) => (
        <TouchableOpacity key={m} onPress={() => setMode(m)} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, marginRight: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: mode===m ? colors.card : 'transparent' }}>
          <Text style={{ color: colors.text, textTransform: 'capitalize' }}>{m}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg }]}> 
      <Text style={[styles.h1, { color: colors.text }]}>Security Settings</Text>

      <Text style={[styles.label, { color: colors.sub }]}>Chats PIN (6 digits)</Text>
      <View style={styles.inputWrap}>
        <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text }]} keyboardType="number-pad" maxLength={6} value={chatsPin} onChangeText={setChatsPin} secureTextEntry={!showChats} />
        <TouchableOpacity style={styles.eye} onPress={() => setShowChats(!showChats)}>
          <Ionicons name={showChats ? "eye-off" : "eye"} size={18} color={colors.sub} />
        </TouchableOpacity>
      </View>

      <Text style={[styles.label, { color: colors.sub }]}>Vault PIN (6 digits)</Text>
      <View style={styles.inputWrap}>
        <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text }]} keyboardType="number-pad" maxLength={6} value={vaultPin} onChangeText={setVaultPin} secureTextEntry={!showVault} />
        <TouchableOpacity style={styles.eye} onPress={() => setShowVault(!showVault)}>
          <Ionicons name={showVault ? "eye-off" : "eye"} size={18} color={colors.sub} />
        </TouchableOpacity>
      </View>

      <Text style={[styles.label, { color: colors.sub }]}>Panic PIN (6 digits)</Text>
      <View style={styles.inputWrap}>
        <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text }]} keyboardType="number-pad" maxLength={6} value={panicPin} onChangeText={setPanicPin} secureTextEntry={!showPanic} />
        <TouchableOpacity style={styles.eye} onPress={() => setShowPanic(!showPanic)}>
          <Ionicons name={showPanic ? "eye-off" : "eye"} size={18} color={colors.sub} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={[styles.btn, { backgroundColor: colors.accent }]} onPress={savePins}><Text style={styles.btnText}>Save PINs</Text></TouchableOpacity>

      <Text style={[styles.h1, { color: colors.text, marginTop: 16 }]}>Auto-lock Timeout (ms)</Text>
      <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text }]} keyboardType="number-pad" value={autoLock} onChangeText={setAutoLock} />
      <TouchableOpacity style={[styles.btn, { backgroundColor: colors.accent }]} onPress={onAutoLockSave}><Text style={styles.btnText}>Save Auto-lock</Text></TouchableOpacity>

      {/* Auto-Wipe Section */}
      <View style={styles.autoWipeSection}>
        <Text style={[styles.h1, { color: colors.text, marginTop: 16 }]}>⏰ Auto-Wipe (Unused Device)</Text>
        <Text style={[styles.sectionSubtitle, { color: colors.sub }]}>
          Automatically wipe device after period of inactivity for security
        </Text>

        {autoWipeStatus && (
          <View style={[styles.statusCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.statusRow}>
              <Text style={[styles.statusLabel, { color: colors.sub }]}>Status:</Text>
              <Text style={[styles.statusValue, { color: autoWipeStatus.enabled ? '#10b981' : colors.sub }]}>
                {autoWipeStatus.enabled ? 'ENABLED' : 'DISABLED'}
              </Text>
            </View>
            {autoWipeStatus.enabled && (
              <>
                <View style={styles.statusRow}>
                  <Text style={[styles.statusLabel, { color: colors.sub }]}>Days until wipe:</Text>
                  <Text style={[styles.statusValue, { 
                    color: autoWipeStatus.days_until_wipe <= 2 ? '#ef4444' : 
                           autoWipeStatus.days_until_wipe <= 5 ? '#f59e0b' : '#10b981' 
                  }]}>
                    {autoWipeStatus.days_until_wipe}
                  </Text>
                </View>
                <View style={styles.statusRow}>
                  <Text style={[styles.statusLabel, { color: colors.sub }]}>Wipe type:</Text>
                  <Text style={[styles.statusValue, { 
                    color: autoWipeStatus.wipe_type === 'full_nuke' ? '#ef4444' : '#3b82f6' 
                  }]}>
                    {autoWipeStatus.wipe_type === 'full_nuke' ? 'FULL NUKE 💀' : 'App Data 🧹'}
                  </Text>
                </View>
                <View style={styles.statusRow}>
                  <Text style={[styles.statusLabel, { color: colors.sub }]}>Last activity:</Text>
                  <Text style={[styles.statusValue, { color: colors.text }]}>
                    {new Date(autoWipeStatus.last_activity * 1000).toLocaleDateString()}
                  </Text>
                </View>
              </>
            )}
          </View>
        )}

        <View style={styles.autoWipeControls}>
          <View style={styles.switchRow}>
            <Text style={[styles.label, { color: colors.text, flex: 1 }]}>Enable Auto-Wipe</Text>
            <Switch
              value={autoWipeEnabled}
              onValueChange={setAutoWipeEnabled}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor={autoWipeEnabled ? '#ffffff' : colors.sub}
            />
          </View>

          <Text style={[styles.label, { color: colors.sub }]}>Days inactive before wipe (1-14)</Text>
          <TextInput 
            style={[styles.input, { borderColor: colors.border, color: colors.text }]} 
            keyboardType="number-pad" 
            value={autoWipeDays} 
            onChangeText={setAutoWipeDays}
            maxLength={2}
            editable={autoWipeEnabled}
          />

          <Text style={[styles.label, { color: colors.sub, marginTop: 12 }]}>Wipe Type</Text>
          <View style={styles.wipeTypeButtons}>
            <TouchableOpacity
              style={[
                styles.wipeTypeButton,
                { 
                  backgroundColor: autoWipeType === 'app_data' ? '#3b82f6' : colors.card,
                  borderColor: colors.border
                }
              ]}
              onPress={() => setAutoWipeType('app_data')}
              disabled={!autoWipeEnabled}
            >
              <Ionicons name="apps" size={16} color={autoWipeType === 'app_data' ? '#fff' : colors.text} />
              <Text style={[
                styles.wipeTypeText,
                { color: autoWipeType === 'app_data' ? '#fff' : colors.text }
              ]}>
                App Data Only
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.wipeTypeButton,
                { 
                  backgroundColor: autoWipeType === 'full_nuke' ? '#ef4444' : colors.card,
                  borderColor: colors.border
                }
              ]}
              onPress={() => setAutoWipeType('full_nuke')}
              disabled={!autoWipeEnabled}
            >
              <Ionicons name="nuclear" size={16} color={autoWipeType === 'full_nuke' ? '#fff' : colors.text} />
              <Text style={[
                styles.wipeTypeText,
                { color: autoWipeType === 'full_nuke' ? '#fff' : colors.text }
              ]}>
                FULL NUKE 💀
              </Text>
            </TouchableOpacity>
          </View>

          {autoWipeType === 'full_nuke' && (
            <View style={[styles.warningBox, { backgroundColor: '#fef2f2', borderColor: '#ef4444' }]}>
              <Ionicons name="warning" size={16} color="#ef4444" />
              <Text style={[styles.warningText, { color: '#dc2626' }]}>
                DANGER: Full NUKE uses STEELOS-SHREDDER for complete data obliteration!
              </Text>
            </View>
          )}

          <TouchableOpacity 
            style={[styles.btn, { backgroundColor: colors.accent, marginTop: 16 }]} 
            onPress={onAutoWipeSave}
            disabled={autoWipeLoading}
          >
            <Text style={styles.btnText}>
              {autoWipeLoading ? 'Configuring...' : 'Save Auto-Wipe Settings'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Active Authentication Section */}
      <View style={styles.autoWipeSection}>
        <Text style={[styles.h1, { color: colors.text, marginTop: 16 }]}>🕒 Active Authentication (Dead Man's Switch)</Text>
        <Text style={[styles.sectionSubtitle, { color: colors.sub }]}>
          Requires you to actively enter your PIN in OMERTA within specified intervals
        </Text>

        {activeAuthStatus && (
          <View style={[styles.statusCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.statusRow}>
              <Text style={[styles.statusLabel, { color: colors.sub }]}>Status:</Text>
              <Text style={[styles.statusValue, { color: activeAuthStatus.enabled ? '#10b981' : colors.sub }]}>
                {activeAuthStatus.enabled ? 'ENABLED' : 'DISABLED'}
              </Text>
            </View>
            {activeAuthStatus.enabled && (
              <>
                <View style={styles.statusRow}>
                  <Text style={[styles.statusLabel, { color: colors.sub }]}>Hours until auth required:</Text>
                  <Text style={[styles.statusValue, { 
                    color: activeAuthStatus.hours_until_auth_required <= 6 ? '#ef4444' : 
                           activeAuthStatus.hours_until_auth_required <= 24 ? '#f59e0b' : '#10b981' 
                  }]}>
                    {activeAuthStatus.hours_until_auth_required}h
                  </Text>
                </View>
                <View style={styles.statusRow}>
                  <Text style={[styles.statusLabel, { color: colors.sub }]}>Wipe type:</Text>
                  <Text style={[styles.statusValue, { 
                    color: activeAuthStatus.wipe_type === 'full_nuke' ? '#ef4444' : '#3b82f6' 
                  }]}>
                    {activeAuthStatus.wipe_type === 'full_nuke' ? 'FULL NUKE 💀' : 'App Data 🧹'}
                  </Text>
                </View>
                <View style={styles.statusRow}>
                  <Text style={[styles.statusLabel, { color: colors.sub }]}>Last authentication:</Text>
                  <Text style={[styles.statusValue, { color: colors.text }]}>
                    {new Date(activeAuthStatus.last_authentication * 1000).toLocaleString()}
                  </Text>
                </View>
                {activeAuthStatus.warning_active && (
                  <View style={[styles.warningBox, { backgroundColor: '#fef2f2', borderColor: '#ef4444' }]}>
                    <Ionicons name="warning" size={16} color="#ef4444" />
                    <Text style={[styles.warningText, { color: '#dc2626' }]}>
                      ⚠️ AUTHENTICATION REQUIRED SOON - Enter your PIN to reset timer!
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>
        )}

        <View style={styles.autoWipeControls}>
          <View style={styles.switchRow}>
            <Text style={[styles.label, { color: colors.text, flex: 1 }]}>Enable Active Authentication</Text>
            <Switch
              value={activeAuthEnabled}
              onValueChange={setActiveAuthEnabled}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor={activeAuthEnabled ? '#ffffff' : colors.sub}
            />
          </View>

          <Text style={[styles.label, { color: colors.sub }]}>Authentication interval (hours)</Text>
          <View style={styles.intervalButtons}>
            {[24, 48, 72, 96, 120, 144, 168].map((hours) => (
              <TouchableOpacity
                key={hours}
                style={[
                  styles.intervalButton,
                  { 
                    backgroundColor: activeAuthHours === hours.toString() ? colors.accent : colors.card,
                    borderColor: colors.border
                  }
                ]}
                onPress={() => setActiveAuthHours(hours.toString())}
                disabled={!activeAuthEnabled}
              >
                <Text style={[
                  styles.intervalText,
                  { color: activeAuthHours === hours.toString() ? '#000' : colors.text }
                ]}>
                  {hours}h
                </Text>
                <Text style={[
                  styles.intervalSubText,
                  { color: activeAuthHours === hours.toString() ? '#000' : colors.sub }
                ]}>
                  {hours === 24 ? '1d' : hours === 48 ? '2d' : hours === 72 ? '3d' : 
                   hours === 96 ? '4d' : hours === 120 ? '5d' : hours === 144 ? '6d' : '7d'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.label, { color: colors.sub, marginTop: 12 }]}>Wipe Type</Text>
          <View style={styles.wipeTypeButtons}>
            <TouchableOpacity
              style={[
                styles.wipeTypeButton,
                { 
                  backgroundColor: activeAuthType === 'app_data' ? '#3b82f6' : colors.card,
                  borderColor: colors.border
                }
              ]}
              onPress={() => setActiveAuthType('app_data')}
              disabled={!activeAuthEnabled}
            >
              <Ionicons name="apps" size={16} color={activeAuthType === 'app_data' ? '#fff' : colors.text} />
              <Text style={[
                styles.wipeTypeText,
                { color: activeAuthType === 'app_data' ? '#fff' : colors.text }
              ]}>
                App Data Only
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.wipeTypeButton,
                { 
                  backgroundColor: activeAuthType === 'full_nuke' ? '#ef4444' : colors.card,
                  borderColor: colors.border
                }
              ]}
              onPress={() => setActiveAuthType('full_nuke')}
              disabled={!activeAuthEnabled}
            >
              <Ionicons name="skull" size={16} color={activeAuthType === 'full_nuke' ? '#fff' : colors.text} />
              <Text style={[
                styles.wipeTypeText,
                { color: activeAuthType === 'full_nuke' ? '#fff' : colors.text }
              ]}>
                DEAD MAN'S SWITCH 💀
              </Text>
            </TouchableOpacity>
          </View>

          {activeAuthType === 'full_nuke' && (
            <View style={[styles.warningBox, { backgroundColor: '#fef2f2', borderColor: '#ef4444' }]}>
              <Ionicons name="skull" size={16} color="#ef4444" />
              <Text style={[styles.warningText, { color: '#dc2626' }]}>
                DEAD MAN'S SWITCH: If you don't authenticate within the interval, STEELOS-SHREDDER will obliterate everything!
              </Text>
            </View>
          )}

          <TouchableOpacity 
            style={[styles.btn, { backgroundColor: colors.accent, marginTop: 16 }]} 
            onPress={onActiveAuthSave}
            disabled={activeAuthLoading}
          >
            <Text style={styles.btnText}>
              {activeAuthLoading ? 'Configuring...' : 'Save Active Authentication Settings'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={[styles.h1, { color: colors.text, marginTop: 16 }]}>Appearance</Text>
      <ModeRow />
      <Text style={[styles.label, { color: colors.sub, marginTop: 8 }]}>Accent</Text>
      <AccentSwatches />

      <View style={{ height: 16 }} />
      <Text style={[styles.h1, { color: colors.text }]}>Verification</Text>
      <TouchableOpacity style={[styles.btn, { backgroundColor: colors.accent }]} onPress={() => router.push('/qr/show')}><Text style={styles.btnText}>Show my QR (OID)</Text></TouchableOpacity>
      <TouchableOpacity style={[styles.btn, { backgroundColor: '#334155' }]} onPress={() => router.push('/qr/scan')}><Text style={styles.btnText}>Scan a QR (Verify)</Text></TouchableOpacity>

      <TouchableOpacity style={[styles.btn, { backgroundColor: '#ef4444', marginTop: 16 }]} onPress={triggerPanic}>
        <Text style={styles.btnText}>Test Panic (Decoy/Wipe)</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  h1: { fontSize: 18, fontWeight: "700", marginBottom: 8 },
  label: { marginTop: 12 },
  input: { height: 44, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12 },
  inputWrap: { position: 'relative' },
  eye: { position: 'absolute', right: 12, top: 14 },
  btn: { marginTop: 12, paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  btnText: { color: "#000", fontWeight: "800" },
  autoWipeSection: {
    marginTop: 16,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  statusCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  autoWipeControls: {
    marginTop: 8,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  wipeTypeButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  wipeTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  wipeTypeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
    gap: 8,
  },
  warningText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  intervalButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  intervalButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    minWidth: 60,
  },
  intervalText: {
    fontSize: 14,
    fontWeight: '600',
  },
  intervalSubText: {
    fontSize: 11,
    marginTop: 2,
  },
});