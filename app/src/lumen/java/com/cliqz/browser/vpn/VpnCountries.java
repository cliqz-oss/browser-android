package com.cliqz.browser.vpn;

import androidx.annotation.StringRes;

import com.cliqz.browser.R;

/**
 * @author Ravjit Uppal
 */
public enum VpnCountries {

    AT(R.string.vpn_austria),
    BA(R.string.vpn_bosnia),
    BG(R.string.vpn_bulgaria),
    CA(R.string.vpn_canada),
    DE(R.string.vpn_germany),
    ES(R.string.vpn_spain),
    FR(R.string.vpn_france),
    GR(R.string.vpn_greece),
    HR(R.string.vpn_croatia),
    HU(R.string.vpn_hungary),
    IN(R.string.vpn_india),
    IT(R.string.vpn_italy),
    NL(R.string.vpn_netherlands),
    PL(R.string.vpn_poland),
    PT(R.string.vpn_portugal),
    RO(R.string.vpn_romania),
    RS(R.string.vpn_serbia),
    TR(R.string.vpn_turkey),
    UA(R.string.vpn_ukraine),
    UK(R.string.vpn_uk),
    US(R.string.vpn_usa),
    VN(R.string.vpn_vietnam);

    public final @StringRes int countryName;

    VpnCountries(@StringRes int countryName) {
        this.countryName = countryName;
    }

    public static @StringRes int getCountryName(String value) {
        try {
            return VpnCountries.valueOf(value).countryName;
        } catch (IllegalArgumentException e) {
            return 0;
        }
    }
}
