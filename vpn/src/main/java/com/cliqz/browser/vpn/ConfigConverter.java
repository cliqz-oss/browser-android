/*
 * Copyright (c) 2012-2016 Arne Schwabe
 * Distributed under the GNU GPL v2 with additional terms. For full terms see the file doc/LICENSE.txt
 */

package com.cliqz.browser.vpn;

import android.annotation.SuppressLint;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.AsyncTask;
import android.os.Build;
import android.os.Environment;
import android.text.TextUtils;
import android.util.Base64;

import com.cliqz.browser.vpn.core.ConfigParser;
import com.cliqz.browser.vpn.core.ProfileManager;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.UnsupportedEncodingException;
import java.net.URLDecoder;
import java.util.HashSet;
import java.util.List;


public class ConfigConverter {

    public static final String IMPORT_PROFILE = "com.cliqz.browser.vpn.IMPORT_PROFILE";
    private static final int RESULT_INSTALLPKCS12 = 7;
    private static final int CHOOSE_FILE_OFFSET = 1000;
    public static final String VPNPROFILE = "vpnProfile";
    private static final int PERMISSION_REQUEST_EMBED_FILES = 37231;
    private static final int PERMISSION_REQUEST_READ_URL = PERMISSION_REQUEST_EMBED_FILES + 1;

    private VpnProfile mResult;
    private String mAliasName = null;
    private AsyncTask<Void, Void, Integer> mImportTask;
    private transient List<String> mPathsegments;

    private String mEmbeddedPwFile;
    private Context mContext;

    public ConfigConverter(Context context) {
        mContext = context;
    }

    private void saveProfile() {
        Intent result = new Intent();
        ProfileManager vpl = ProfileManager.getInstance(mContext);

        if (!TextUtils.isEmpty(mEmbeddedPwFile))
            ConfigParser.useEmbbedUserAuth(mResult, mEmbeddedPwFile);
        vpl.addProfile(mResult);
        vpl.saveProfile(mContext, mResult);
        vpl.saveProfileList(mContext);
        result.putExtra(VpnProfile.EXTRA_PROFILEUUID, mResult.getUUID().toString());
    }

    private String getUniqueProfileName(String possibleName) {

        int i = 0;

        ProfileManager vpl = ProfileManager.getInstance(mContext);

        String newname = possibleName;

        // 	Default to
        if (mResult.mName != null && !ConfigParser.CONVERTED_PROFILE.equals(mResult.mName))
            newname = mResult.mName;

        while (newname == null || vpl.getProfileByName(newname) != null) {
            i++;
            if (i == 1)
                newname = "test";
            else
                newname = "test";
        }

        return newname;
    }

    private String embedFile(String filename, Utils.FileType type, boolean onlyFindFileAndNullonNotFound) {
        if (filename == null)
            return null;

        // Already embedded, nothing to do
        if (VpnProfile.isEmbedded(filename))
            return filename;

        return null;
    }

    private File findFileRaw(String filename) {
        if (filename == null || filename.equals(""))
            return null;

        // Try diffent path relative to /mnt/sdcard
        File sdcard = Environment.getExternalStorageDirectory();
        File root = new File("/");

        HashSet<File> dirlist = new HashSet<>();

        for (int i = mPathsegments.size() - 1; i >= 0; i--) {
            String path = "";
            for (int j = 0; j <= i; j++) {
                path += "/" + mPathsegments.get(j);
            }
            // Do a little hackish dance for the Android File Importer
            // /document/primary:ovpn/openvpn-imt.conf


            if (path.indexOf(':') != -1 && path.lastIndexOf('/') > path.indexOf(':')) {
                String possibleDir = path.substring(path.indexOf(':') + 1, path.length());
                // Unquote chars in the  path
                try {
                    possibleDir = URLDecoder.decode(possibleDir, "UTF-8");
                } catch (UnsupportedEncodingException ignored) {
                }

                possibleDir = possibleDir.substring(0, possibleDir.lastIndexOf('/'));


                dirlist.add(new File(sdcard, possibleDir));

            }
            dirlist.add(new File(path));


        }
        dirlist.add(sdcard);
        dirlist.add(root);


        String[] fileparts = filename.split("/");
        for (File rootdir : dirlist) {
            String suffix = "";
            for (int i = fileparts.length - 1; i >= 0; i--) {
                if (i == fileparts.length - 1)
                    suffix = fileparts[i];
                else
                    suffix = fileparts[i] + "/" + suffix;

                File possibleFile = new File(rootdir, suffix);
                if (possibleFile.canRead())
                    return possibleFile;

            }
        }
        return null;
    }

    String readFileContent(File possibleFile, boolean base64encode) {
        byte[] filedata;
        try {
            filedata = readBytesFromFile(possibleFile);
        } catch (IOException e) {
            return null;
        }

        String data;
        if (base64encode) {
            data = Base64.encodeToString(filedata, Base64.DEFAULT);
        } else {
            data = new String(filedata);

        }

        return VpnProfile.DISPLAYNAME_TAG + possibleFile.getName() + VpnProfile.INLINE_TAG + data;

    }


    private byte[] readBytesFromFile(File file) throws IOException {
        InputStream input = new FileInputStream(file);

        long len = file.length();
        if (len > VpnProfile.MAX_EMBED_FILE_SIZE)
            throw new IOException("File size of file to import too large.");

        // Create the byte array to hold the data
        byte[] bytes = new byte[(int) len];

        // Read in the bytes
        int offset = 0;
        int bytesRead;
        while (offset < bytes.length
                && (bytesRead = input.read(bytes, offset, bytes.length - offset)) >= 0) {
            offset += bytesRead;
        }

        input.close();
        return bytes;
    }

    void embedFiles(ConfigParser cp) {
        // This where I would like to have a c++ style
        // void embedFile(std::string & option)

        if (mResult.mPKCS12Filename != null) {
            File pkcs12file = findFileRaw(mResult.mPKCS12Filename);
            if (pkcs12file != null) {
                mAliasName = pkcs12file.getName().replace(".p12", "");
            } else {
                mAliasName = "Imported PKCS12";
            }
        }


        mResult.mCaFilename = embedFile(mResult.mCaFilename, Utils.FileType.CA_CERTIFICATE, false);
        mResult.mClientCertFilename = embedFile(mResult.mClientCertFilename, Utils.FileType.CLIENT_CERTIFICATE, false);
        mResult.mClientKeyFilename = embedFile(mResult.mClientKeyFilename, Utils.FileType.KEYFILE, false);
        mResult.mTLSAuthFilename = embedFile(mResult.mTLSAuthFilename, Utils.FileType.TLS_AUTH_FILE, false);
        mResult.mPKCS12Filename = embedFile(mResult.mPKCS12Filename, Utils.FileType.PKCS12, false);
        mResult.mCrlFilename = embedFile(mResult.mCrlFilename, Utils.FileType.CRL_FILE, true);
        if (cp != null) {
            mEmbeddedPwFile = cp.getAuthUserPassFile();
            mEmbeddedPwFile = embedFile(cp.getAuthUserPassFile(), Utils.FileType.USERPW_FILE, false);
        }

    }

    @SuppressLint("StaticFieldLeak")
    public void startImportTask(final Uri data, final String possibleName) {
        mImportTask = new AsyncTask<Void, Void, Integer>() {

            @Override
            protected Integer doInBackground(Void... params) {
                try {
                    InputStream is = mContext.getContentResolver().openInputStream(data);

                    doImport(is);
                    is.close();
                    if (mResult == null)
                        return -3;
                } catch (IOException | SecurityException se)

                {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M)
                        return -2;
                }

                return 0;
            }

            @Override
            protected void onPostExecute(Integer errorCode) {
                if (errorCode == 0) {
                    mResult.mName = getUniqueProfileName(possibleName);
                    saveProfile();
                }
            }
        }.execute();
    }

    private void doImport(InputStream is) {
        ConfigParser cp = new ConfigParser();
        try {
            InputStreamReader isr = new InputStreamReader(is);

            cp.parseConfig(isr);
            mResult = cp.convertProfile();
            embedFiles(cp);
            return;

        } catch (IOException | ConfigParser.ConfigParseError e) {
        }
        mResult = null;

    }
}

