package com.mendelev.mpos.documents

import android.graphics.Color
import android.text.Layout
import org.json.JSONObject
import java.io.File

/** PurchaseOrderPDF.swift geometry and typography, with Android text shaping. */
internal object MPosPurchasePdf {
    fun write(order:JSONObject,file:File)=MPosPdfPages(595,842).use{pages->
        val d=MPosDocumentCanvas;val ink=Color.rgb(18,23,33);val muted=Color.rgb(97,107,122);val dark=Color.rgb(18,26,41);val accent=Color.rgb(33,102,242);val soft=Color.rgb(245,247,250);val line=Color.rgb(224,230,237)
        var y=36f
        fun text(s:String,x:Float,top:Float,w:Float,size:Float=8.5f,bold:Boolean=false,color:Int=ink,right:Boolean=false,center:Boolean=false)=d.text(pages.canvas,s,x,top,w,size,if(bold)700 else 400,color,if(center)Layout.Alignment.ALIGN_CENTER else if(right)Layout.Alignment.ALIGN_OPPOSITE else Layout.Alignment.ALIGN_NORMAL,1.5f)
        fun footer(){d.round(pages.canvas,36f,799f,523f,.7f,0f,line);text("M POS",36f,810f,150f,8.5f,true,muted);text("Заказ поставщику",409f,810f,150f,8.5f,false,muted,true);text(pages.number.toString(),539f,810f,20f,8.5f,true,right=true)}
        fun next(){pages.next();y=36f;if(pages.number>1){d.round(pages.canvas,36f,y,523f,42f,12f,dark);text("ПРИЛАВОК",50f,45f,100f,8.5f,true,Color.WHITE);text("ЗАКАЗ ПОСТАВЩИКУ",50f,57f,250f,12f,true,Color.WHITE);text("Продолжение",449f,50f,96f,8.5f,false,Color.LTGRAY);y=94f}}
        next();d.round(pages.canvas,36f,36f,523f,118f,22f,dark)
        text("ПРИЛАВОК",58f,53f,335f,8.5f,true,Color.LTGRAY);text("ЗАКАЗ ПОСТАВЩИКУ",58f,72f,335f,25f,true,Color.WHITE)
        val timestamp=order.optLong("timestamp").takeIf{it>0}?:System.currentTimeMillis()
        text(d.date(timestamp),59f,114f,210f,11.5f,false,Color.LTGRAY)
        d.round(pages.canvas,441f,56f,100f,68f,14f,Color.rgb(42,49,62));text("ЗАКАЗ",454f,67f,74f,8.5f,true,Color.LTGRAY,center=true);text("#"+(timestamp/1000).toString().takeLast(6),454f,85f,74f,16f,true,Color.WHITE,center=true)
        y=172f
        val company=order.optJSONObject("company")?:JSONObject()
        fun party(x:Float,label:String,badge:String,color:Int){d.round(pages.canvas,x,y,255.5f,132f,18f,soft);d.round(pages.canvas,x,y,255.5f,132f,18f,line,.7f);d.round(pages.canvas,x+14f,y+14f,34f,24f,8f,color);text(badge,x+14f,y+20f,34f,8.5f,true,Color.WHITE,center=true);text(label,x+56f,y+20f,185.5f,11f,true)}
        party(36f,"ЗАКАЗЧИК","01",dark);party(303.5f,"ПОСТАВЩИК","02",accent)
        var customerY=y+52f
        val legal=company.optString("legalName");val address=company.optString("deliveryAddress")
        if(legal.isNotBlank()){text("Юридическое лицо",52f,customerY,223.5f,8.5f,false,muted);customerY+=14f;customerY+=text(legal,52f,customerY,223.5f,11.5f,true)+8f}
        if(address.isNotBlank()){text("Адрес доставки",52f,customerY,223.5f,8.5f,false,muted);customerY+=14f;text(address,52f,customerY,223.5f,11.5f)}
        if(legal.isBlank()&&address.isBlank())text("Данные не указаны",52f,customerY,223.5f,11.5f,false,muted)
        text("Название поставщика",319.5f,y+52f,223.5f,8.5f,false,muted);text(order.optString("supplierName").ifBlank{"Поставщик не указан"},319.5f,y+66f,223.5f,11.5f,true)
        val items=d.objects(order.optJSONArray("items"));y+=154f;text("СОСТАВ ЗАКАЗА",36f,y,400f,11f,true);text("${items.size} позиций",409f,y,150f,8.5f,true,muted,true);y+=16f
        var tableTop=y
        fun header(){tableTop=y;d.round(pages.canvas,36f,y,523f,34f,18f,dark);text("№",48f,y+10f,25f,8.5f,true,Color.LTGRAY);text("ТОВАР",78f,y+10f,403f,8.5f,true,Color.WHITE);text("КОЛ-ВО",484f,y+10f,62f,8.5f,true,Color.WHITE,true);y+=34f}
        fun outline(){d.round(pages.canvas,36f,tableTop,523f,maxOf(42f,y-tableTop),18f,line,.9f)}
        header()
        items.forEachIndexed{index,item->
            val name=item.optString("productName","Товар");val qty=item.optString("quantityText").ifBlank{"${item.opt("qty")?:0} шт."}
            val h=maxOf(39f,maxOf(d.layout(name,353f,11.5f,spacing=1.5f).height,d.layout(qty,120f,11.5f,700,spacing=1.5f).height)+18f)
            if(y+h>777f){outline();footer();next();header()}
            if(index%2==0)d.round(pages.canvas,37f,y,521f,h,0f,Color.rgb(251,252,252))
            text((index+1).toString(),48f,y+11f,25f,8.5f,false,muted);text(name,78f,y+10f,353f,11.5f);text(qty,427f,y+10f,120f,11.5f,true,right=true)
            y+=h;d.round(pages.canvas,78f,y-.5f,481f,.5f,0f,line)
        }
        outline();y+=8f
        if(y+92f>777f){footer();next()}else y+=18f
        d.round(pages.canvas,36f,y,523f,72f,18f,soft);d.round(pages.canvas,36f,y,523f,72f,18f,line,.7f)
        text("ИТОГО ПО ЗАКАЗУ",54f,y+14f,300f,8.5f,true,muted);text(items.size.toString(),54f,y+32f,200f,20f,true);text("позиций",54f,y+55f,200f,8.5f,false,muted);text("По позициям",379f,y+25f,160f,20f,true,dark,true);y+=92f
        if(y+58f>777f){footer();next()}
        d.round(pages.canvas,36f,y,523f,58f,16f,dark);text("ПРОСЬБА ПОДТВЕРДИТЬ НАЛИЧИЕ И СРОКИ ПОСТАВКИ",52f,y+13f,491f,8.5f,true,Color.WHITE);text("Документ сформирован автоматически",52f,y+32f,491f,8.5f,false,Color.LTGRAY)
        footer();pages.save(file)
    }
}
