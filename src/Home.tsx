import React, { useEffect, useMemo, useState, useCallback } from 'react';
import * as anchor from '@project-serum/anchor';

import styled from 'styled-components';
import Container from 'react-bootstrap/Container';
import Card from 'react-bootstrap/Card';
import Spinner from 'react-bootstrap/Spinner';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import { PublicKey } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';

import { Snackbar } from '@material-ui/core';

import Alert from '@material-ui/lab/Alert';

import {
    awaitTransactionSignatureConfirmation,
    CandyMachineAccount,
    CANDY_MACHINE_PROGRAM,
    getCandyMachineState,
    mintOneToken,
} from './utils/candy-machine';
import { AlertState } from './utils/utils';
import { checkWLWallet,  } from './utils/checkWLWallet';
import { Header } from './components/Header';
import { MintButton } from './components/MintButton';
import { GatewayProvider } from '@civic/solana-gateway-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { usePoller } from './hooks/usePoller';

const IMAGE_LINK = '/mint.jpeg';
const LOGO_LINK = '/cynova-launch.png';


const ConnectButton = styled(WalletMultiButton)`
    width: 100%;
    height: 60px;
    margin-top: 10px;
    margin-bottom: 5px;
    background: linear-gradient(29deg, #34342f 0%, #44c3a1 100%);
    color: white;
    font-size: 16px;
    font-weight: bold;
`;

const StyledPaper = styled(Card)`
    padding: 20px;
    background-color: #000000;
    border-radius: 6px;
    margin: 10px;
`;
const MintContainer = styled.div``; // add your owns styles here

export interface HomeProps {
    candyMachineId?: anchor.web3.PublicKey;
    connection: anchor.web3.Connection;
    startDate: number;
    txTimeout: number;
    rpcHost: string;
}

const Home = (props: HomeProps) => {
    const [isUserMinting, setIsUserMinting] = useState(false);
    const [wlmintTimes, setMintTimes] = useState(0);

    const [candyMachine, setCandyMachine] = useState<CandyMachineAccount>();
    const [userHasWhitelistToken, setUserHasWhitelistToken] = useState(false);
    const [alertState, setAlertState] = useState<AlertState>({
        open: false,
        message: '',
        severity: undefined,
    });
    const [loading, setLoading] = useState(true);
    const rpcUrl = props.rpcHost;
    const wallet = useWallet();

    const anchorWallet = useMemo(() => {
        if (!wallet || !wallet.publicKey || !wallet.signAllTransactions || !wallet.signTransaction) {
            return;
        }

        return {
            publicKey: wallet.publicKey,
            signAllTransactions: wallet.signAllTransactions,
            signTransaction: wallet.signTransaction,
            //@ts-ignore
        } as anchor.Wallet;
    }, [wallet]);

    const refreshCandyMachineState = useCallback(async () => {
        if (!anchorWallet) {
            return;
        }

        if (props.candyMachineId) {
            try {
              
                let mintTimes = localStorage.getItem('hgvhgxschg12dfdd');
                
                const cndy = await getCandyMachineState(anchorWallet, props.candyMachineId, props.connection);
                setCandyMachine(cndy);
                const WLToken = checkWLWallet(anchorWallet.publicKey);
                WLToken ? setUserHasWhitelistToken(true) : setUserHasWhitelistToken(false);
                if (mintTimes === "1" && wlmintTimes === 0) {
                    setUserHasWhitelistToken(false) 
                }
                if(wlmintTimes === 1 ){
                    setUserHasWhitelistToken(false)
                }
         
            } catch (e) {
                console.log('There was a problem fetching Candy Machine state');
                console.log(e);
            }
        }
    }, [anchorWallet, props.candyMachineId, props.connection, wlmintTimes]);
    let pollTime;
    usePoller(
        () => {
            refreshCandyMachineState();
        },
        pollTime ? pollTime : 9999
    );
    const onMint = async () => {
        let minter = window.localStorage.getItem('hgvhgxschg');
        // console.log(anchorWallet.publicKey.toBase58().toString())
        // fetchWLWallets();
        try {
            
            document.getElementById('#identity')?.click();
            if (wallet.connected && candyMachine?.program && wallet.publicKey ) {
                const mintTxId = (await mintOneToken(candyMachine, wallet.publicKey))[0];
                setIsUserMinting(true);
                let status: any = { err: true };
                if (mintTxId) {
                    status = await awaitTransactionSignatureConfirmation(
                        mintTxId,
                        props.txTimeout,
                        props.connection,
                        true
                    );
                }
             
              
                if (status && !status.err) {
                    localStorage.setItem('hgvhgxschg', anchorWallet.publicKey);
                    localStorage.setItem('hgvhgxschg12dfdd', "1");

                    setAlertState({
                        open: true,
                        message: 'Congratulations! Mint succeeded!',
                        severity: 'success',
                    });
                } else {
                    localStorage.setItem('hgvhgxschg', anchorWallet.publicKey);
                    localStorage.setItem('hgvhgxschg12dfdd', "0");
                    setAlertState({
                        open: true,
                        message: 'Mint failed! Please try again!',
                        severity: 'error',
                    });
                }
            }
        } catch (error: any) {
            let message = error.msg || 'Minting failed! Please try again!';
            if (!error.msg) {
                if (!error.message) {
                    message = 'Transaction Timeout! Please try again.';
                } else if (error.message.indexOf('0x137')) {
                    message = `SOLD OUT!`;
                } else if (error.message.indexOf('0x135')) {
                    message = `Insufficient funds to mint. Please fund your wallet.`;
                }else if (minter !== anchorWallet.publicKey){
                    message = `Can only mint 1 per wallet`;

                }
            } else {
                if (error.code === 311) {
                    message = `SOLD OUT!`;
                    window.location.reload();
                } else if (error.code === 312) {
                    message = `Minting period hasn't started yet.`;
                }
            }

            setAlertState({
                open: true,
                message,
                severity: 'error',
            });
        } finally {
            setIsUserMinting(false);
        }
    };

    useEffect(() => {
   
        refreshCandyMachineState();
    }, [anchorWallet, props.candyMachineId, props.connection, refreshCandyMachineState, userHasWhitelistToken]);

    return (
        <>
            <Container style={{ marginTop: 15 }}>
                <Row className="justify-content-center">
                    <Col xs="12" sm="10" xl="4">
                        <StyledPaper>
                            <div>
                                <img src={IMAGE_LINK} alt="" width="100%" style={{ borderRadius: '5px' }} />
                            </div>
                        </StyledPaper>

                        <StyledPaper>
                            {!wallet.connected ? (
                                <ConnectButton>Connect Wallet</ConnectButton>
                            ) : !userHasWhitelistToken ? (
                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'center',
                                        width: '100%',
                                        flexWrap: 'wrap'
                                    }}
                                >
                                     <Header
                                        candyMachine={candyMachine}
                                        refreshCandyMachineState={refreshCandyMachineState}
                                    />
                                    <>
                                    <Spinner animation="border" variant="secondary" />
                                    </>
                                    
                                  
                                </div>
                            ) : (
                                <>
                                    <Header
                                        candyMachine={candyMachine}
                                        refreshCandyMachineState={refreshCandyMachineState}
                                    />
                                    <MintContainer>
                                        {candyMachine?.state.isActive &&
                                        candyMachine?.state.gatekeeper &&
                                        wallet.publicKey &&
                                        wallet.signTransaction ? (
                                            <GatewayProvider
                                                wallet={{
                                                    publicKey: wallet.publicKey || new PublicKey(CANDY_MACHINE_PROGRAM),
                                                    //@ts-ignore
                                                    signTransaction: wallet.signTransaction,
                                                }}
                                                gatekeeperNetwork={candyMachine?.state?.gatekeeper?.gatekeeperNetwork}
                                                clusterUrl={rpcUrl}
                                                options={{ autoShowModal: false }}
                                            >
                                                <MintButton
                                                    candyMachine={candyMachine}
                                                    isMinting={isUserMinting}
                                                    onMint={onMint}
                                                    userHasWhitelistToken={userHasWhitelistToken}
                                                    loading={loading}
                                                />
                                            </GatewayProvider>
                                        ) : (
                                            <MintButton
                                                candyMachine={candyMachine}
                                                isMinting={isUserMinting}
                                                onMint={onMint}
                                                userHasWhitelistToken={userHasWhitelistToken}
                                                loading={loading}
                                            />
                                        )}
                                    </MintContainer>
                                </>
                            )}
                        </StyledPaper>
                    </Col>
                </Row>
             
                    <div className="launch">
                        <a href="https://linktr.ee/thecynova" target="_blank" rel="noreferrer">
                        <img src={LOGO_LINK} alt="" width="15%" style={{ borderRadius: '5px' }} />
                        </a>
                    </div>
                   
             
                <Snackbar
                    open={alertState.open}
                    autoHideDuration={6000}
                    onClose={() => setAlertState({ ...alertState, open: false })}
                >
                    <Alert onClose={() => setAlertState({ ...alertState, open: false })} severity={alertState.severity}>
                        {alertState.message}
                    </Alert>
                </Snackbar>
            </Container>
        </>
    );
};

export default Home;