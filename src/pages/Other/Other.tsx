import {
    ActionSheet,
    Body,
    Button,
    Content,
    Icon,
    List,
    ListItem,
    Right,
    Text,
    Toast,
    View,
} from 'native-base';
import React, { useEffect, useState } from 'react';
import { Alert, Linking, StyleSheet } from 'react-native';
import { Actions } from 'react-native-router-flux';
import PageContainer from '../../components/PageContainer';

import { useIsLogin } from '../../hooks/useStore';
import socket from '../../socket';
import action from '../../state/action';
import { removeStorageValue } from '../../utils/storage';
import appInfo from '../../../app.json';
import Avatar from '../../components/Avatar';
import Sponsor from './Sponsor';

function getIsNight() {
    const hour = new Date().getHours();
    return hour >= 18 || hour < 6;
}

function Other() {
    const isLogin = useIsLogin();
    const [isNight, setIsNight] = useState(getIsNight());
    const [showSponsorDialog, toggleSponsorDialog] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => {
            setIsNight(getIsNight());
        }, 1000);
        return () => {
            clearInterval(timer);
        };
    }, []);

    async function logout() {
        action.logout();
        await removeStorageValue('token');
        Toast.show({ text: '您已经退出登录' });
        socket.disconnect();
        socket.connect();
    }

    function login() {
        Actions.push('login');
    }

    function handleSponsorOK() {
        toggleSponsorDialog(false);
        // When you close the Sponsor Dialog, the ActionSheet will also be closed. So timeout is required
        setTimeout(() => {
            const options = ['支付宝', '取消'];
            ActionSheet.show(
                {
                    options,
                    cancelButtonIndex: options.findIndex((str) => str === '取消'),
                    title: '选择支付方式',
                },
                async (buttonIndex) => {
                    switch (buttonIndex) {
                        case 0: {
                            const alipayUrl = 'HTTPS://QR.ALIPAY.COM/FKX08821LJVDHRXFYYYU3A';
                            const canOpenURL = await Linking.canOpenURL(alipayUrl);
                            if (canOpenURL) {
                                Linking.openURL(alipayUrl);
                            } else {
                                Alert.alert('错误', '无法打开支付宝');
                            }
                            break;
                        }
                        default: {
                            break;
                        }
                    }
                },
            );
        }, 500);
    }

    return (
        <PageContainer>
            <Content>
                <View style={styles.app}>
                    <Avatar
                        src={
                            isNight
                                ? require('../../../icon.png')
                                : require('../../assets/images/wuzeiniang.gif')
                        }
                        size={100}
                    />
                    <Text style={styles.name}>
                        fiora v
                        {appInfo.expo.version}
                    </Text>
                </View>
                <List style={styles.list}>
                    <ListItem
                        icon
                        onPress={() => Linking.openURL('https://github.com/yinxin630/fiora-app')}
                    >
                        <Body>
                            <Text style={styles.listItemTitle}>源码</Text>
                        </Body>
                        <Right>
                            <Icon active name="arrow-forward" style={styles.listItemArrow} />
                        </Right>
                    </ListItem>
                    <ListItem icon onPress={() => Linking.openURL('https://www.suisuijiang.com')}>
                        <Body>
                            <Text style={styles.listItemTitle}>作者</Text>
                        </Body>
                        <Right>
                            <Icon active name="arrow-forward" style={styles.listItemArrow} />
                        </Right>
                    </ListItem>
                    <ListItem icon onPress={() => toggleSponsorDialog(true)}>
                        <Body>
                            <Text style={styles.listItemTitle}>赞助</Text>
                        </Body>
                        <Right>
                            <Icon active name="arrow-forward" style={styles.listItemArrow} />
                        </Right>
                    </ListItem>
                </List>
            </Content>
            {isLogin ? (
                <Button danger block style={styles.logoutButton} onPress={logout}>
                    <Text>退出登录</Text>
                </Button>
            ) : (
                <Button block style={styles.logoutButton} onPress={login}>
                    <Text>登录 / 注册</Text>
                </Button>
            )}
            <View style={styles.copyrightContainer}>
                <Text style={styles.copyright}>
                    Copyright© 2015-
                    {new Date().getFullYear()}
                    {' '}
                    碎碎酱
                </Text>
            </View>
            <Sponsor
                visible={showSponsorDialog}
                onClose={() => toggleSponsorDialog(false)}
                onOK={handleSponsorOK}
            />
        </PageContainer>
    );
}

const styles = StyleSheet.create({
    logoutButton: {
        marginLeft: 12,
        marginRight: 12,
    },
    app: {
        alignItems: 'center',
        paddingTop: 12,
    },
    name: {
        marginTop: 6,
        color: '#222',
    },
    list: {
        marginTop: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
    },
    listItemTitle: {
        color: '#333',
    },
    listItemArrow: {
        color: '#999',
    },
    github: {
        fontSize: 26,
        color: '#000',
    },
    copyrightContainer: {
        marginTop: 12,
        marginBottom: 6,
    },
    copyright: {
        fontSize: 10,
        textAlign: 'center',
        color: '#666',
    },
});

export default Other;
