package com.mendelev.mpos.administration

import android.app.Activity
import android.app.AlertDialog
import android.os.Bundle
import android.os.Looper
import android.view.KeyEvent
import org.robolectric.Shadows.shadowOf
import android.provider.Settings
import android.view.accessibility.AccessibilityNodeInfo
import android.view.accessibility.AccessibilityEvent
import android.view.inputmethod.EditorInfo
import android.widget.EditText
import java.security.MessageDigest
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk=[28])
class AdministrationPasswordTest {
    private fun idle() { shadowOf(Looper.getMainLooper()).idle() }
    private val fixture="fixture-password"
    private fun verifier()=AdministrationPasswordVerifier(MessageDigest.getInstance("SHA-256").digest(fixture.toByteArray()).joinToString(""){"%02x".format(it)})
    @Test fun immediateMaskIgnoresSystemLastCharacterRevealAndEditableUpdates() {
        val activity=Robolectric.buildActivity(Activity::class.java).setup().get()
        Settings.System.putInt(activity.contentResolver,Settings.System.TEXT_SHOW_PASSWORD,1)
        val dialog=AdministrationPasswordDialog.create(activity,{false},{ });dialog.show();idle()
        val field=dialog.findViewById<EditText>(android.R.id.edit)
        field.setText("a");assertEquals("•",field.transformationMethod.getTransformation(field.text,field).toString())
        field.text.append("B2!");assertEquals("••••",field.transformationMethod.getTransformation(field.text,field).toString())
        assertTrue(field.transformationMethod is AlwaysMaskedPasswordTransformation)
        dialog.dismiss();idle();assertEquals("",field.text.toString())
    }
    @Test fun remoteAccessibilitySetTextAndInputConnectionWorkWithoutOnScreenKeyboard() {
        val activity=Robolectric.buildActivity(Activity::class.java).setup().get();val results=mutableListOf<String?>()
        val dialog=AdministrationPasswordDialog.create(activity,verifier()::matches,{results.add(it)});dialog.show();idle()
        val field=dialog.findViewById<EditText>(android.R.id.edit)
        val args=Bundle().apply { putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE,fixture) }
        assertTrue(field.performAccessibilityAction(AccessibilityNodeInfo.ACTION_SET_TEXT,args))
        assertEquals(fixture,field.text.toString());assertEquals("•".repeat(fixture.length),field.transformationMethod.getTransformation(field.text,field).toString())
        val info=field.createAccessibilityNodeInfo();assertFalse(info.isPassword);assertEquals("•".repeat(fixture.length),info.text.toString())
        val event=AccessibilityEvent.obtain(AccessibilityEvent.TYPE_VIEW_TEXT_CHANGED);event.text.add(fixture);event.beforeText=fixture;field.onInitializeAccessibilityEvent(event)
        assertFalse(event.text.any { it.toString().contains(fixture) });assertFalse(event.beforeText.toString().contains(fixture))
        dialog.getButton(AlertDialog.BUTTON_POSITIVE).performClick();idle();assertEquals(listOf(fixture),results);assertEquals("",field.text.toString())
        val second=AdministrationPasswordDialog.create(activity,verifier()::matches,{results.add(it)});second.show();idle()
        val input=second.findViewById<EditText>(android.R.id.edit)
        assertTrue(input.onCreateInputConnection(EditorInfo())!!.commitText(fixture,1));assertEquals(fixture,input.text.toString())
        second.dismiss();idle();assertNull(results.last())
    }
    @Test fun wrongPasswordClearsFieldAndBridgeRejectsMissingCredential() {
        val activity=Robolectric.buildActivity(Activity::class.java).setup().get();val results=mutableListOf<String?>()
        val verifier=verifier();val bridge=AdministrationPasswordBridge(verifier,"fixture-session-token")
        assertFalse(bridge.verify("wrong-token",fixture));assertTrue(bridge.verify("fixture-session-token",fixture));assertFalse(bridge.verify("fixture-session-token","wrong"))
        val dialog=AdministrationPasswordDialog.create(activity,verifier::matches,{results.add(it)});dialog.show();idle()
        val field=dialog.findViewById<EditText>(android.R.id.edit);field.setText("wrong");dialog.getButton(AlertDialog.BUTTON_POSITIVE).performClick();idle()
        assertTrue(results.isEmpty());assertEquals("",field.text.toString());assertTrue(dialog.isShowing)
        dialog.dismiss();idle();assertEquals(listOf<String?>(null),results)
    }
    @Test fun hardwareEnterConfirmsExactlyOnce() {
        val activity=Robolectric.buildActivity(Activity::class.java).setup().get();val results=mutableListOf<String?>()
        val dialog=AdministrationPasswordDialog.create(activity,verifier()::matches,{results.add(it)});dialog.show();idle()
        val field=dialog.findViewById<EditText>(android.R.id.edit);field.setText(fixture)
        field.dispatchKeyEvent(KeyEvent(KeyEvent.ACTION_DOWN,KeyEvent.KEYCODE_ENTER));field.dispatchKeyEvent(KeyEvent(KeyEvent.ACTION_UP,KeyEvent.KEYCODE_ENTER));idle()
        assertEquals(listOf(fixture),results);assertEquals("",field.text.toString())
    }

}
