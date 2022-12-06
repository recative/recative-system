package tv.jbcz.resourceloader.database


import android.content.ContentValues
import android.content.Context
import android.database.Cursor
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import android.provider.BaseColumns
import android.provider.BaseColumns._ID
import android.util.Log
import tv.jbcz.resourceloader.base64Encode

data class FileEntity(
    var id: Long? = 0,
    var downloadmanager_id: Long,
    var hash: String? = null,
    var resourceId: String
) : BaseColumns {
    companion object {
        @JvmStatic
        val TABLE_NAME = "file_info"

        @JvmStatic
        val COL_DOWNLOADMANAGER_ID_FK = "downloadmanager_id"

        @JvmStatic
        val COL_HASH = "hash"

        @JvmStatic
        val COL_RESOURCE = "resource_id"

    }
}

class FileInfoDao(context: Context) {
    val dbHelper: SQLiteOpenHelper by lazy {
        OpenDbHelper(context)
    }

    private fun parseFileEntity(cursor: Cursor) = FileEntity(
        cursor.getLong(cursor.getColumnIndexOrThrow(BaseColumns._ID)),
        cursor.getLong(cursor.getColumnIndexOrThrow(FileEntity.COL_DOWNLOADMANAGER_ID_FK)),
        cursor.getString(cursor.getColumnIndexOrThrow(FileEntity.COL_HASH)),
        cursor.getString(cursor.getColumnIndexOrThrow(FileEntity.COL_RESOURCE))
    )

    fun queryAll() = dbHelper.readableDatabase.query(
        FileEntity.TABLE_NAME, null, null, null,
        null, null, null
    )?.let {
        ArrayList<FileEntity>().apply {
            while (it.moveToNext()) add(parseFileEntity(it))
        }
    }

    fun queryByDownloadId(id: Long):FileEntity? {
        return dbHelper.readableDatabase.query(
            FileEntity.TABLE_NAME, null,
            "${FileEntity.COL_DOWNLOADMANAGER_ID_FK} = ?",
            arrayOf(id.toString()),
            null, null, "${BaseColumns._ID}"
        )?.let { cursor ->
            ArrayList<FileEntity>().also {
                while (cursor.moveToNext()) {
                    parseFileEntity(cursor)
                        ?.run {
                            it.add(this)
                        }
                }
            }.lastOrNull()
        }
    }

    fun queryByResourceId(id: String): List<FileEntity>? {
        var db = dbHelper.writableDatabase
        return db.query(
            FileEntity.TABLE_NAME, null,
            "${FileEntity.COL_RESOURCE} = ?",
            arrayOf(id),
            null, null, "${_ID}"
        )?.let { cursor ->
            if (cursor.count > 0) {
                ArrayList<FileEntity>().also {
                    while (cursor.moveToNext()) {
                        parseFileEntity(cursor)
                            ?.run {
                                it.add(this)
                            }
                    }
                }
            } else null
        }
    }
    fun query(hash: String): FileEntity? {
        return dbHelper.readableDatabase.query(
            FileEntity.TABLE_NAME, null,
            "${FileEntity.COL_HASH} = ?",
            arrayOf(hash),
            null, null, "${BaseColumns._ID}"
        )?.let { cursor ->
            if (cursor.count > 0) {
                ArrayList<FileEntity>().also {
                    while (cursor.moveToNext()) {
                        parseFileEntity(cursor)
                            ?.run {
                                it.add(this)
                            }
                    }
                }.lastOrNull()
            } else null
        }
    }

    fun insert(model: FileEntity) {
        var db = dbHelper.writableDatabase
        db.insert(FileEntity.TABLE_NAME, null,
            ContentValues().apply {
                put(FileEntity.COL_DOWNLOADMANAGER_ID_FK, model.downloadmanager_id)
                put(FileEntity.COL_HASH, model.hash)
                put(FileEntity.COL_RESOURCE, model.resourceId)
            })
//        db.close()
    }

    fun delete(model: FileEntity) {
        var db = dbHelper.writableDatabase.apply {
            delete(FileEntity.TABLE_NAME, "${BaseColumns._ID} = ?", arrayOf(model.id.toString()))
        }
    }

    fun deleteAll() {
        dbHelper.writableDatabase.delete(FileEntity.TABLE_NAME, null, null)
    }

    fun update(model: FileEntity) {

    }
}

class OpenDbHelper(context: Context) : SQLiteOpenHelper(
    context, "file_info.db", null, 2
) {
    override fun onCreate(db: SQLiteDatabase?) {
        db?.run {
            execSQL(
                "CREATE TABLE ${FileEntity.TABLE_NAME} ($_ID INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL," +
                        "${FileEntity.COL_DOWNLOADMANAGER_ID_FK} INTEGER," +
                        "${FileEntity.COL_HASH} TEXT," +
                        "${FileEntity.COL_RESOURCE} TEXT)"
            )
        }
    }

    override fun onUpgrade(db: SQLiteDatabase?, oldVersion: Int, newVersion: Int) {
        when (oldVersion) {
            else -> {
                db?.run {
                    execSQL("DROP TABLE ${FileEntity.TABLE_NAME}")
                }
            }
        }
        onCreate(db)
    }
}