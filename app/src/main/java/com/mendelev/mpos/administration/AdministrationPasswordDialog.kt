package com.mendelev.mpos.administration

import android.app.AlertDialog
import android.content.Context
import android.text.InputType
import android.text.method.PasswordTransformationMethod
import android.os.Bundle
import android.view.accessibility.AccessibilityNodeInfo
import android.view.accessibility.AccessibilityEvent
import android.view.KeyEvent
import android.view.View
import android.view.inputmethod.EditorInfo
import androidx.appcompat.widget.AppCompatEditText
import android.widget.LinearLayout

/** Never creates the temporary Visible spans used by the standard password transformation. */
class AlwaysMaskedPasswordTransformation : PasswordTransformationMethod() {
    override fun getTransformation(source: CharSequence, view: View): CharSequence = object : CharSequence {
        override val length: Int get()=source.length
        override fun get(index: Int): Char { require(index in 0 until length);return '\u2022' }
        override fun subSequence(startIndex: Int,endIndex: Int): CharSequence = "\u2022".repeat(endIndex-startIndex)
        override fun toString(): String = "\u2022".repeat(length)
    }
}
/** Remote controllers may set text, but accessibility only receives masked text. */
class AdministrationPasswordEditText(context: Context) : AppCompatEditText(context) {
    override fun onInitializeAccessibilityNodeInfo(info: AccessibilityNodeInfo) {
        super.onInitializeAccessibilityNodeInfo(info)
        // Expose a writable text control to remote controllers, but never its clear value.
        // The real inputType remains PASSWORD for the system IME.
        info.isPassword=false;info.inputType=InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS
        info.text="\u2022".repeat(text?.length?:0)
        info.addAction(AccessibilityNodeInfo.AccessibilityAction.ACTION_SET_TEXT)
    }
    private fun maskEvent(event: AccessibilityEvent) {
        event.isPassword=false
        val lengths=event.text.map { it.length };event.text.clear();lengths.forEach { event.text.add("\u2022".repeat(it)) }
        event.beforeText=event.beforeText?.let { "\u2022".repeat(it.length) }
    }
    override fun onInitializeAccessibilityEvent(event: AccessibilityEvent) { super.onInitializeAccessibilityEvent(event);maskEvent(event) }
    override fun onPopulateAccessibilityEvent(event: AccessibilityEvent) { super.onPopulateAccessibilityEvent(event);maskEvent(event) }
    override fun sendAccessibilityEventUnchecked(event: AccessibilityEvent) { maskEvent(event);super.sendAccessibilityEventUnchecked(event) }
    override fun performAccessibilityAction(action: Int,args: Bundle?): Boolean {
        if(action==AccessibilityNodeInfo.ACTION_SET_TEXT&&isEnabled){
            val value=args?.getCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE)?:return false
            setText(value);setSelection(text?.length?:0);return true
        }
        return super.performAccessibilityAction(action,args)
    }
}
object AdministrationPasswordDialog {
    fun create(context:Context,verifier:(String)->Boolean,onResult:(String?)->Unit):AlertDialog {
        val padding=(24*context.resources.displayMetrics.density).toInt()
        val field=AdministrationPasswordEditText(context).apply {
            filters=arrayOf(android.text.InputFilter.LengthFilter(256))
            id=android.R.id.edit
            hint="Пароль администратора"
            inputType=InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
            isSingleLine=true
            transformationMethod=AlwaysMaskedPasswordTransformation()
            imeOptions=EditorInfo.IME_ACTION_DONE or EditorInfo.IME_FLAG_NO_EXTRACT_UI or EditorInfo.IME_FLAG_NO_PERSONALIZED_LEARNING
            importantForAutofill=View.IMPORTANT_FOR_AUTOFILL_NO
        }
        val container=LinearLayout(context).apply { setPadding(padding,padding/2,padding,padding/2);addView(field,LinearLayout.LayoutParams(-1,-2)) }
        var finished=false
        val dialog=AlertDialog.Builder(context).setTitle("Администрирование").setView(container)
            .setNegativeButton("Отмена",null).setPositiveButton("Войти",null).create()
        dialog.setOnShowListener {
            fun submit(){
                if(finished)return
                val candidate=field.text?.toString().orEmpty()
                if(!verifier(candidate)){field.text?.clear();field.error="Неверный пароль";return}
                finished=true;field.text?.clear();dialog.dismiss();onResult(candidate)
            }
            dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener { submit() }
            field.setOnEditorActionListener { _,action,event ->
                if(action==EditorInfo.IME_ACTION_DONE||(event?.keyCode==KeyEvent.KEYCODE_ENTER&&event.action==KeyEvent.ACTION_DOWN)){submit();true}else false
            }
            field.requestFocus()
        }
        dialog.setOnDismissListener { field.text?.clear();if(!finished){finished=true;onResult(null)} }
        return dialog
    }
}
