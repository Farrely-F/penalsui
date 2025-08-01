#!/bin/bash

# PenalSUI Smart Contract Deployment Script
# This script deploys the contract and saves deployment logs

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PACKAGE_NAME="penalsui"
NETWORK=${1:-"testnet"}  # Default to testnet, can pass mainnet as argument
DEPLOYMENTS_DIR="deployments"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DEPLOYMENT_LOG="${DEPLOYMENTS_DIR}/${NETWORK}_${TIMESTAMP}.json"
LATEST_DEPLOYMENT="${DEPLOYMENTS_DIR}/${NETWORK}_latest.json"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if required tools are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command -v sui &> /dev/null; then
        print_error "SUI CLI is not installed. Please install it first."
        echo "Visit: https://docs.sui.io/build/install"
        exit 1
    fi
    
    if ! command -v jq &> /dev/null; then
        print_warning "jq is not installed. JSON formatting will be limited."
        JQ_AVAILABLE=false
    else
        JQ_AVAILABLE=true
    fi
    
    print_success "Dependencies check completed"
}

# Function to create deployments directory
setup_deployments_dir() {
    print_status "Setting up deployments directory..."
    mkdir -p "${DEPLOYMENTS_DIR}"
    print_success "Deployments directory created: ${DEPLOYMENTS_DIR}"
}

# Function to validate network
validate_network() {
    print_status "Validating network: ${NETWORK}"
    
    if [[ "${NETWORK}" != "testnet" && "${NETWORK}" != "mainnet" && "${NETWORK}" != "devnet" ]]; then
        print_error "Invalid network: ${NETWORK}"
        echo "Valid networks: testnet, mainnet, devnet"
        exit 1
    fi
    
    print_success "Network validated: ${NETWORK}"
}

# Function to build the package
build_package() {
    print_status "Building SUI package..."
    
    if sui move build; then
        print_success "Package built successfully"
    else
        print_error "Package build failed"
        exit 1
    fi
}

# Function to run tests
run_tests() {
    print_status "Running unit tests..."
    
    if sui move test; then
        print_success "All tests passed"
    else
        print_error "Tests failed"
        echo "Do you want to continue with deployment anyway? (y/N)"
        read -r response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# Function to deploy the contract
deploy_contract() {
    print_status "Deploying contract to ${NETWORK}..."
    
    # Execute deployment and capture output
    local deploy_output
    local deploy_exit_code
    
    deploy_output=$(sui client publish --gas-budget 100000000 --json 2>&1)
    deploy_exit_code=$?
    
    if [ $deploy_exit_code -eq 0 ]; then
        print_success "Contract deployed successfully!"
        
        # Save deployment output
        echo "$deploy_output" > "${DEPLOYMENT_LOG}"
        
        # Create latest deployment symlink/copy
        echo "$deploy_output" > "${LATEST_DEPLOYMENT}"
        
        # Parse and display key information
        parse_deployment_info "$deploy_output"
        
    else
        print_error "Deployment failed!"
        echo "Error output:"
        echo "$deploy_output"
        
        # Save error log
        local error_log="${DEPLOYMENTS_DIR}/${NETWORK}_${TIMESTAMP}_ERROR.log"
        echo "$deploy_output" > "$error_log"
        echo "Error log saved to: $error_log"
        
        exit 1
    fi
}

# Function to parse and display deployment information
parse_deployment_info() {
    local deploy_output="$1"
    
    print_status "Parsing deployment information..."
    
    if [ "$JQ_AVAILABLE" = true ]; then
        # Extract key information using jq
        local package_id
        local transaction_digest
        local gas_used
        local created_objects
        
        package_id=$(echo "$deploy_output" | jq -r '.objectChanges[] | select(.type=="published") | .packageId' 2>/dev/null || echo "N/A")
        transaction_digest=$(echo "$deploy_output" | jq -r '.digest' 2>/dev/null || echo "N/A")
        gas_used=$(echo "$deploy_output" | jq -r '.effects.gasUsed.computationCost + .effects.gasUsed.storageCost' 2>/dev/null || echo "N/A")
        
        echo ""
        echo "=================================="
        echo "🎉 DEPLOYMENT SUCCESSFUL!"
        echo "=================================="
        echo "📦 Package ID: $package_id"
        echo "🧾 Transaction Digest: $transaction_digest"
        echo "⛽ Gas Used: $gas_used MIST"
        echo "🌐 Network: $NETWORK"
        echo "⏰ Deployed At: $(date)"
        echo "📄 Log File: $DEPLOYMENT_LOG"
        echo "=================================="
        echo ""
        
        # Save human-readable summary
        local summary_file="${DEPLOYMENTS_DIR}/${NETWORK}_${TIMESTAMP}_summary.txt"
        cat > "$summary_file" << EOF
PenalSUI Smart Contract Deployment Summary
=========================================

Network: $NETWORK
Package ID: $package_id
Transaction Digest: $transaction_digest
Gas Used: $gas_used MIST
Deployed At: $(date)
Deployer: $(sui client active-address)

Deployment Log: $DEPLOYMENT_LOG

Contract Functions:
- create_game(): Create a new penalty shootout game
- join_game(): Join an existing game
- start_game(): Start a game with 2 players
- shoot(): Submit a penalty kick direction
- keep(): Submit a goalkeeper guess direction

View Functions:
- get_game_state(): Get complete game information
- get_current_round_info(): Get current round details
- get_current_turn(): Get whose turn it is
- direction_left/center/right(): Get direction constants

Next Steps:
1. Save the Package ID for frontend integration
2. Update your frontend config with the new Package ID
3. Test the deployed contract on $NETWORK
4. Consider setting up a game registry frontend

EOF
        
        print_success "Deployment summary saved to: $summary_file"
        
        # Create environment file for frontend
        create_env_file "$package_id" "$NETWORK"
        
    else
        echo ""
        echo "=================================="
        echo "🎉 DEPLOYMENT SUCCESSFUL!"
        echo "=================================="
        echo "Raw output saved to: $DEPLOYMENT_LOG"
        echo "Network: $NETWORK"
        echo "Deployed At: $(date)"
        echo "=================================="
        echo ""
        print_warning "Install 'jq' for better deployment info parsing"
    fi
}

# Function to create environment file for frontend integration
create_env_file() {
    local package_id="$1"
    local network="$2"
    
    local env_file="${DEPLOYMENTS_DIR}/${network}.env"
    
    cat > "$env_file" << EOF
# PenalSUI Contract Environment Variables for ${network}
# Generated on $(date)

REACT_APP_PENALSUI_PACKAGE_ID=${package_id}
REACT_APP_SUI_NETWORK=${network}
REACT_APP_SUI_RPC_URL=$(get_rpc_url "$network")

# Contract Module
REACT_APP_PENALSUI_MODULE=penalsui::game

# Function Names
REACT_APP_CREATE_GAME_FUNCTION=create_game
REACT_APP_JOIN_GAME_FUNCTION=join_game
REACT_APP_START_GAME_FUNCTION=start_game
REACT_APP_SHOOT_FUNCTION=shoot
REACT_APP_KEEP_FUNCTION=keep
EOF
    
    print_success "Environment file created: $env_file"
    echo "Copy this file to your frontend project and rename to .env.local"
}

# Function to get RPC URL for network
get_rpc_url() {
    case "$1" in
        "mainnet")
            echo "https://fullnode.mainnet.sui.io:443"
            ;;
        "testnet")
            echo "https://fullnode.testnet.sui.io:443"
            ;;
        "devnet")
            echo "https://fullnode.devnet.sui.io:443"
            ;;
        *)
            echo "https://fullnode.testnet.sui.io:443"
            ;;
    esac
}

# Function to display usage
show_usage() {
    echo "Usage: $0 [network]"
    echo ""
    echo "Networks:"
    echo "  testnet  - Deploy to SUI testnet (default)"
    echo "  mainnet  - Deploy to SUI mainnet"
    echo "  devnet   - Deploy to SUI devnet"
    echo ""
    echo "Examples:"
    echo "  $0           # Deploy to testnet"
    echo "  $0 testnet   # Deploy to testnet"
    echo "  $0 mainnet   # Deploy to mainnet"
    echo ""
}

# Function to confirm deployment
confirm_deployment() {
    echo ""
    print_warning "You are about to deploy PenalSUI to ${NETWORK}"
    echo "Active address: $(sui client active-address)"
    echo "Active environment: $(sui client active-env)"
    echo ""
    echo "Continue with deployment? (y/N)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        print_status "Deployment cancelled by user"
        exit 0
    fi
}

# Main deployment function
main() {
    echo ""
    echo "🎮 PenalSUI Smart Contract Deployment Script"
    echo "============================================="
    echo ""
    
    # Parse command line arguments
    if [[ "$1" == "-h" || "$1" == "--help" ]]; then
        show_usage
        exit 0
    fi
    
    # Check dependencies
    check_dependencies
    
    # Setup
    setup_deployments_dir
    validate_network
    
    # Confirm deployment
    confirm_deployment
    
    # Build and test
    build_package
    run_tests
    
    # Deploy
    deploy_contract
    
    print_success "Deployment completed successfully!"
    echo ""
    echo "📁 All deployment files saved in: ${DEPLOYMENTS_DIR}/"
    echo "🔗 Use the Package ID in your frontend application"
    echo "📖 Check the summary file for detailed information"
    echo ""
}

# Run main function
main "$@"